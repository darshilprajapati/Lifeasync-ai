using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutExerciseCompletions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkoutExerciseCompletions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutPlanId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutDayId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutDayExerciseId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseId = table.Column<int>(type: "integer", nullable: false),
                    SessionDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutExerciseCompletions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutExerciseCompletions_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkoutExerciseCompletions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkoutExerciseCompletions_WorkoutDayExercises_WorkoutDayEx~",
                        column: x => x.WorkoutDayExerciseId,
                        principalTable: "WorkoutDayExercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkoutExerciseCompletions_WorkoutDays_WorkoutDayId",
                        column: x => x.WorkoutDayId,
                        principalTable: "WorkoutDays",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutExerciseCompletions_ExerciseId",
                table: "WorkoutExerciseCompletions",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutExerciseCompletions_UserId_WorkoutDayExerciseId_Sess~",
                table: "WorkoutExerciseCompletions",
                columns: new[] { "UserId", "WorkoutDayExerciseId", "SessionDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutExerciseCompletions_WorkoutDayExerciseId",
                table: "WorkoutExerciseCompletions",
                column: "WorkoutDayExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutExerciseCompletions_WorkoutDayId",
                table: "WorkoutExerciseCompletions",
                column: "WorkoutDayId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkoutExerciseCompletions");
        }
    }
}
