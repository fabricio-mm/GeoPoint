using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoPointAPI.Migrations
{
    /// <inheritdoc />
    public partial class updatedafaultsnakecase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Password",
                table: "USERS",
                newName: "password");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "password",
                table: "USERS",
                newName: "Password");
        }
    }
}
