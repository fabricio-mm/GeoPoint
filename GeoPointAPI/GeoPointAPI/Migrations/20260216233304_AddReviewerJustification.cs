using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoPointAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewerJustification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "justification_reviewer",
                table: "REQUESTS",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "justification_reviewer",
                table: "REQUESTS");
        }
    }
}
