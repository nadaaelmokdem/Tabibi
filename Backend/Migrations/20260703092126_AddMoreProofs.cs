using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreProofs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DegreeProofUrl",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdProofUrl",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DegreeProofUrl",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IdProofUrl",
                table: "DoctorProfiles");
        }
    }
}
