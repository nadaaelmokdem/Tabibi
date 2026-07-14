using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnifyVideoAndCallToVideoCall : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Data Migration: Shift enum values
            // Call (2) -> VideoCall (1)
            migrationBuilder.Sql("UPDATE Appointments SET ConsultationType = 1 WHERE ConsultationType = 2;");
            migrationBuilder.Sql("UPDATE ChatSessions SET ConsultationType = 1 WHERE ConsultationType = 2;");
            
            // Clinic (3) -> Clinic (2)
            migrationBuilder.Sql("UPDATE Appointments SET ConsultationType = 2 WHERE ConsultationType = 3;");
            migrationBuilder.Sql("UPDATE ChatSessions SET ConsultationType = 2 WHERE ConsultationType = 3;");

            // Data Migration: Resolve Price & Flags
            migrationBuilder.Sql("UPDATE DoctorProfiles SET VideoPrice = CallPrice WHERE CallPrice > VideoPrice;");
            migrationBuilder.Sql("UPDATE DoctorProfiles SET IsVideoEnabled = 1 WHERE IsCallEnabled = 1;");

            migrationBuilder.DropColumn(
                name: "CallPrice",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "IsCallEnabled",
                table: "DoctorProfiles");

            migrationBuilder.RenameColumn(
                name: "VideoPrice",
                table: "DoctorProfiles",
                newName: "VideoCallPrice");

            migrationBuilder.RenameColumn(
                name: "IsVideoEnabled",
                table: "DoctorProfiles",
                newName: "IsVideoCallEnabled");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VideoCallPrice",
                table: "DoctorProfiles",
                newName: "VideoPrice");

            migrationBuilder.RenameColumn(
                name: "IsVideoCallEnabled",
                table: "DoctorProfiles",
                newName: "IsVideoEnabled");

            migrationBuilder.AddColumn<decimal>(
                name: "CallPrice",
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
        }
    }
}
