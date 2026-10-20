using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLocationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider != null &&
                (migrationBuilder.ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ||
                 migrationBuilder.ActiveProvider.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase)))
            {
                migrationBuilder.Sql(@"
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""City"" text;
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Country"" text;
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""State"" text;
                ");
            }
            else
            {
                migrationBuilder.AddColumn<string>(
                    name: "City",
                    table: "Users",
                    type: "text",
                    nullable: true);

                migrationBuilder.AddColumn<string>(
                    name: "Country",
                    table: "Users",
                    type: "text",
                    nullable: true);

                migrationBuilder.AddColumn<string>(
                    name: "State",
                    table: "Users",
                    type: "text",
                    nullable: true);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Users");
        }
    }
}
