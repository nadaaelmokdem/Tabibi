using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientProfilePictureUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfilePictureUrl",
                table: "PatientProfiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePictureUrl",
                table: "PatientProfiles");
        }
    }
}
