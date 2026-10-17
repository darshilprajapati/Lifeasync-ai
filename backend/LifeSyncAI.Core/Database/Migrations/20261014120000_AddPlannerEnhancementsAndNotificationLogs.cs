using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddPlannerEnhancementsAndNotificationLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "PlannerEvents",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReminderSent",
                table: "PlannerEvents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReminderSentAt",
                table: "PlannerEvents",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MissedDeadlinePenalized",
                table: "PlannerEvents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PenaltyAppliedAt",
                table: "PlannerEvents",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PlannerEvents",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PlannerEvents",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserNotificationLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    NotificationType = table.Column<string>(type: "text", nullable: false),
                    ReferenceId = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    RecipientEmail = table.Column<string>(type: "text", nullable: false),
                    IsSuccess = table.Column<bool>(type: "boolean", nullable: false),
                    Details = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotificationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserNotificationLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            var isSuccessFilter = migrationBuilder.ActiveProvider switch
            {
                "Microsoft.EntityFrameworkCore.SqlServer" => "[IsSuccess] = 1",
                "Microsoft.EntityFrameworkCore.Sqlite" => "\"IsSuccess\" = 1",
                _ => "\"IsSuccess\" = true"
            };

            migrationBuilder.CreateIndex(
                name: "IX_UserNotificationLogs_UserId_NotificationType_ReferenceId",
                table: "UserNotificationLogs",
                columns: new[] { "UserId", "NotificationType", "ReferenceId" },
                unique: true,
                filter: isSuccessFilter);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserNotificationLogs");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "ReminderSent",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "ReminderSentAt",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "MissedDeadlinePenalized",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "PenaltyAppliedAt",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PlannerEvents");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PlannerEvents");
        }
    }
}
