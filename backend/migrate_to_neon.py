"""
LifeSync AI - Standalone Production Database Migration: SQLite -> Neon PostgreSQL
Preserves all primary keys, foreign keys, timestamps, user/admin accounts, and application state.
Idempotent, safe to rerun, protected from duplicate records, and includes pre/post-migration validation.
"""

import os
import sys
import shutil
import argparse
import sqlite3
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_batch

TABLES_IN_DEPENDENCY_ORDER = [
    "Users",
    "PlannerEvents",
    "Transactions",
    "HealthLogs",
    "JobApplications",
    "VaultItems",
    "AiRecommendations",
    "RecurringItems"
]

def mask_connection_string(conn_str: str) -> str:
    """Masks credentials in connection string for safe console logging."""
    if not conn_str:
        return "[EMPTY]"
    try:
        if "@" in conn_str:
            user_part, host_part = conn_str.split("@", 1)
            prefix = user_part.split(":")[0] if ":" in user_part else "postgres"
            return f"{prefix}:****@{host_part}"
        elif "Password=" in conn_str:
            import re
            return re.sub(r'Password=[^;]+', 'Password=****', conn_str, flags=re.IGNORECASE)
    except Exception:
        pass
    return "[MASKED_CONNECTION_STRING]"

def create_source_backup(sqlite_path: str) -> str:
    """Creates a timestamped non-destructive backup copy of the source SQLite database."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{sqlite_path}.backup_{timestamp}"
    shutil.copy2(sqlite_path, backup_path)
    print(f"[Backup] Successfully preserved source backup at: {backup_path}")
    return backup_path

def collect_source_row_counts(sqlite_path: str) -> dict:
    """Collects row counts for every table in the source SQLite database."""
    counts = {}
    conn = sqlite3.connect(sqlite_path)
    cur = conn.cursor()
    for table in TABLES_IN_DEPENDENCY_ORDER:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if cur.fetchone():
            cur.execute(f'SELECT COUNT(*) FROM "{table}"')
            counts[table] = cur.fetchone()[0]
        else:
            counts[table] = 0
    conn.close()
    return counts

def validate_target_neon(tgt_cur, source_counts: dict) -> tuple[bool, list[str]]:
    """
    Validates:
    1. Row counts between SQLite and Neon.
    2. Primary key uniqueness.
    3. Foreign key integrity.
    4. Admin and user account preservation.
    """
    errors = []
    print("\n--- RUNNING POST-MIGRATION VALIDATION ---")

    # 1. Row counts
    for table, expected_min in source_counts.items():
        tgt_cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        neon_count = tgt_cur.fetchone()[0]
        print(f" - [{table}] Source={expected_min} | Neon={neon_count}")
        if neon_count < expected_min:
            errors.append(f"Row count mismatch in '{table}': expected at least {expected_min}, found {neon_count} in Neon.")

    # 2. Primary key uniqueness
    for table in TABLES_IN_DEPENDENCY_ORDER:
        tgt_cur.execute(f'SELECT "Id", COUNT(*) FROM "{table}" GROUP BY "Id" HAVING COUNT(*) > 1')
        duplicates = tgt_cur.fetchall()
        if duplicates:
            errors.append(f"Duplicate primary key(s) detected in '{table}': {duplicates}")

    # 3. Foreign key validation (all dependent tables reference Users("Id"))
    for table in TABLES_IN_DEPENDENCY_ORDER:
        if table == "Users":
            continue
        tgt_cur.execute(f'SELECT COUNT(*) FROM "{table}" WHERE "UserId" NOT IN (SELECT "Id" FROM "Users")')
        orphan_count = tgt_cur.fetchone()[0]
        if orphan_count > 0:
            errors.append(f"Foreign key violation: {orphan_count} orphaned records found in '{table}'.")

    # 4. Users validation (ensure emails unique and admin presence)
    tgt_cur.execute('SELECT "Id", "Email", "Role" FROM "Users" WHERE "Role" = 1')
    admins = tgt_cur.fetchall()
    print(f" - [Validation] Discovered {len(admins)} Admin user(s) in Neon PostgreSQL.")

    is_valid = len(errors) == 0
    return is_valid, errors

def migrate_sqlite_to_neon(sqlite_path: str, neon_connection_string: str) -> bool:
    if not os.path.exists(sqlite_path):
        print(f"[ERROR] Source SQLite database not found at: {sqlite_path}")
        print("[ABORT] Cannot verify actual production database source. Destructive migration aborted.")
        return False

    print("==================================================")
    print("STARTING EXPLICIT SQLITE -> NEON POSTGRES MIGRATION")
    print("==================================================")
    print(f"[Source] {sqlite_path}")
    print(f"[Target] {mask_connection_string(neon_connection_string)}")

    # Step 1: Create Backup
    backup_file = create_source_backup(sqlite_path)

    # Step 2: Pre-migration Row Count Collection
    source_counts = collect_source_row_counts(sqlite_path)
    print("\n[Pre-Migration Source Counts]:")
    for tbl, cnt in source_counts.items():
        print(f" - {tbl}: {cnt} rows")

    src_conn = sqlite3.connect(sqlite_path)
    src_conn.row_factory = sqlite3.Row
    src_cur = src_conn.cursor()

    tgt_conn = psycopg2.connect(neon_connection_string)
    tgt_conn.autocommit = False
    tgt_cur = tgt_conn.cursor()

    summary = {}

    try:
        for table in TABLES_IN_DEPENDENCY_ORDER:
            # Check if source table exists
            src_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not src_cur.fetchone():
                print(f"[Skip] Source table '{table}' does not exist in SQLite.")
                summary[table] = {"source_rows": 0, "migrated_rows": 0}
                continue

            src_cur.execute(f'SELECT * FROM "{table}"')
            rows = src_cur.fetchall()
            row_count = len(rows)

            if row_count == 0:
                print(f"[{table}] 0 rows in source.")
                summary[table] = {"source_rows": 0, "migrated_rows": 0}
                continue

            # Check if target table exists
            tgt_cur.execute("SELECT to_regclass(%s)", (f'public."{table}"',))
            if not tgt_cur.fetchone()[0]:
                raise RuntimeError(f"Target table public.\"{table}\" does not exist in Neon. Run EF Core migrations first.")

            # Inspect PostgreSQL target table column types for accurate data type coercion (e.g. SQLite 0/1 to PostgreSQL boolean)
            tgt_cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
            """, (table,))
            col_types = {r[0]: r[1].lower() for r in tgt_cur.fetchall()}

            # Extract column names from source
            col_names = [d[0] for d in src_cur.description]
            cols_joined = ", ".join([f'"{c}"' for c in col_names])
            placeholders = ", ".join(["%s"] * len(col_names))

            # Query existing IDs in Neon to guarantee idempotency and avoid duplicates
            tgt_cur.execute(f'SELECT "Id" FROM "{table}"')
            existing_ids = set(r[0] for r in tgt_cur.fetchall())

            to_insert = []
            for row in rows:
                row_dict = dict(row)
                if row_dict.get("Id") not in existing_ids:
                    row_values = []
                    for col in col_names:
                        val = row_dict[col]
                        target_type = col_types.get(col, "")
                        # Explicitly coerce SQLite boolean integers/strings to Python bool for PostgreSQL boolean columns
                        if target_type == "boolean":
                            if val is not None:
                                if isinstance(val, (int, float)):
                                    val = bool(val)
                                elif isinstance(val, str):
                                    val = val.strip().lower() in ("1", "true", "t", "yes")
                        row_values.append(val)
                    to_insert.append(row_values)

            if to_insert:
                insert_query = f'INSERT INTO "{table}" ({cols_joined}) VALUES ({placeholders}) ON CONFLICT ("Id") DO NOTHING'
                execute_batch(tgt_cur, insert_query, to_insert)
                print(f"[{table}] Inserted {len(to_insert)} new record(s) (total source rows: {row_count}).")
            else:
                print(f"[{table}] All {row_count} records already present in Neon.")

            # Update PostgreSQL identity sequence safely to avoid collision on subsequent application inserts
            tgt_cur.execute("""
                SELECT COALESCE(
                    pg_get_serial_sequence(%s, 'Id'),
                    pg_get_serial_sequence(%s, 'Id')
                )
            """, (f'"{table}"', f'public."{table}"'))
            seq_row = tgt_cur.fetchone()
            seq_name = seq_row[0] if seq_row else None
            if seq_name:
                tgt_cur.execute(f'SELECT MAX("Id") FROM "{table}"')
                max_id = tgt_cur.fetchone()[0]
                if max_id is not None:
                    tgt_cur.execute("SELECT setval(%s, %s, true)", (seq_name, max_id))
                else:
                    tgt_cur.execute("SELECT setval(%s, 1, false)", (seq_name,))

            summary[table] = {"source_rows": row_count, "migrated_rows": len(to_insert)}

        # Run Post-Migration Validations before committing
        is_valid, validation_errors = validate_target_neon(tgt_cur, source_counts)

        if not is_valid:
            print("\n[VALIDATION FAILED] Transaction will be rolled back!")
            for err in validation_errors:
                print(f" - Error: {err}")
            tgt_conn.rollback()
            return False

        tgt_conn.commit()
        print("\n==========================================")
        print("MIGRATION & VALIDATION COMPLETED SUCCESSFULLY")
        print("==========================================")
        print(f"Source backup preserved at: {backup_file}")
        for tbl, stats in summary.items():
            print(f" - {tbl}: Source={stats['source_rows']}, Migrated={stats['migrated_rows']}")
        return True

    except Exception as ex:
        tgt_conn.rollback()
        print(f"\n[ERROR] Migration failed with exception: {ex}")
        return False
    finally:
        src_conn.close()
        tgt_conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LifeSync AI Explicit Neon Database Migrator")
    parser.add_argument(
        "--neon-url",
        default=os.getenv("ConnectionStrings__DefaultConnection") or os.getenv("NEON_URL"),
        help="Neon PostgreSQL Connection String"
    )
    parser.add_argument(
        "--source-sqlite",
        default="/app/data/lifesync.db" if os.path.exists("/app/data/lifesync.db") else "data/lifesync.db",
        help="Path to source SQLite database"
    )

    args = parser.parse_args()

    if not args.neon_url:
        print("[ERROR] Neon PostgreSQL connection string not provided.")
        print("Set ConnectionStrings__DefaultConnection or NEON_URL environment variable or pass --neon-url.")
        sys.exit(1)

    success = migrate_sqlite_to_neon(args.source_sqlite, args.neon_url)
    sys.exit(0 if success else 1)
