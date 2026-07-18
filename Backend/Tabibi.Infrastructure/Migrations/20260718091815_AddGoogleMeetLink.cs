using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleMeetLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoogleMeetLink",
                table: "VideoCallSessions",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoogleMeetLink",
                table: "VideoCallSessions");
        }
    }
}
