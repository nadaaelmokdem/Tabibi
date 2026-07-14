using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewCountToDoctorProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                table: "DoctorProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReviewCount",
                table: "DoctorProfiles");
        }
    }
}
