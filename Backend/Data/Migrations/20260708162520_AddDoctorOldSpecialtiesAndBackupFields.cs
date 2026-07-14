using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorOldSpecialtiesAndBackupFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OldDegreeProofUrl",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldIdProofUrl",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OldLicenseExpiryDate",
                table: "DoctorProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldLicenseNumber",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldLicenseProofUrl",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldNationalIdNumber",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DoctorOldSpecialties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DoctorId = table.Column<int>(type: "int", nullable: false),
                    SpecialtyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorOldSpecialties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorOldSpecialties_DoctorProfiles_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "DoctorProfiles",
                        principalColumn: "DoctorId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DoctorOldSpecialties_Specialties_SpecialtyId",
                        column: x => x.SpecialtyId,
                        principalTable: "Specialties",
                        principalColumn: "SpecialtyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorOldSpecialties_DoctorId",
                table: "DoctorOldSpecialties",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorOldSpecialties_SpecialtyId",
                table: "DoctorOldSpecialties",
                column: "SpecialtyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorOldSpecialties");

            migrationBuilder.DropColumn(
                name: "OldDegreeProofUrl",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "OldIdProofUrl",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "OldLicenseExpiryDate",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "OldLicenseNumber",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "OldLicenseProofUrl",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "OldNationalIdNumber",
                table: "DoctorProfiles");
        }
    }
}
