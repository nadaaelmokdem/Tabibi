using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecificDateAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SpecificDate",
                table: "DoctorAvailabilities",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpecificDate",
                table: "DoctorAvailabilities");
        }
    }
}
