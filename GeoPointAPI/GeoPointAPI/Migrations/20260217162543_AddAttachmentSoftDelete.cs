using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoPointAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "ATTACHMENTS",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "ATTACHMENTS");
        }
    }
}
