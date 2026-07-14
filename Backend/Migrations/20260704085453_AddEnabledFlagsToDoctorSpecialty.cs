using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddEnabledFlagsToDoctorSpecialty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCallEnabled",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsChatEnabled",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsClinicEnabled",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVideoEnabled",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsCallEnabled",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "IsChatEnabled",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "IsClinicEnabled",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "IsVideoEnabled",
                table: "DoctorSpecialties");
        }
    }
}
