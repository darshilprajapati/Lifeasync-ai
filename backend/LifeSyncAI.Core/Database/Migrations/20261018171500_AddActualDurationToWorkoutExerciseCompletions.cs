using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddActualDurationToWorkoutExerciseCompletions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ActualDurationMinutes",
                table: "WorkoutExerciseCompletions",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualDurationMinutes",
                table: "WorkoutExerciseCompletions");
        }
    }
}
