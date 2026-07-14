using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class MovePricesToDoctorProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CallPrice",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "ChatPrice",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "ClinicPrice",
                table: "DoctorSpecialties");

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

            migrationBuilder.DropColumn(
                name: "VideoPrice",
                table: "DoctorSpecialties");

            migrationBuilder.AddColumn<decimal>(
                name: "CallPrice",
                table: "DoctorProfiles",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ChatPrice",
                table: "DoctorProfiles",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ClinicPrice",
                table: "DoctorProfiles",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsCallEnabled",
                table: "DoctorProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsChatEnabled",
                table: "DoctorProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsClinicEnabled",
                table: "DoctorProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVideoEnabled",
                table: "DoctorProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "VideoPrice",
                table: "DoctorProfiles",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CallPrice",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "ChatPrice",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "ClinicPrice",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IsCallEnabled",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IsChatEnabled",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IsClinicEnabled",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IsVideoEnabled",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "VideoPrice",
                table: "DoctorProfiles");

            migrationBuilder.AddColumn<decimal>(
                name: "CallPrice",
                table: "DoctorSpecialties",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ChatPrice",
                table: "DoctorSpecialties",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ClinicPrice",
                table: "DoctorSpecialties",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

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

            migrationBuilder.AddColumn<decimal>(
                name: "VideoPrice",
                table: "DoctorSpecialties",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
