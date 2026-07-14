using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminCommentToDoctorProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "DoctorProfiles");

            migrationBuilder.AddColumn<string>(
                name: "AdminComment",
                table: "DoctorProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "DoctorProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerificationStatus",
                table: "DoctorProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminComment",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "DoctorProfiles");

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "DoctorProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
