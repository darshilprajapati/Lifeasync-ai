using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261018173500_AddCustomExercisesAndHealthLogSync")]
    public partial class AddCustomExercisesAndHealthLogSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HealthLogId",
                table: "WorkoutExerciseCompletions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Exercises",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryMuscles",
                table: "Exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostureTips",
                table: "Exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommonMistakes",
                table: "Exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SafetyTips",
                table: "Exercises",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HealthLogId",
                table: "WorkoutExerciseCompletions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "SecondaryMuscles",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "PostureTips",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "CommonMistakes",
                table: "Exercises");

            migrationBuilder.DropColumn(
                name: "SafetyTips",
                table: "Exercises");
        }
    }
}
