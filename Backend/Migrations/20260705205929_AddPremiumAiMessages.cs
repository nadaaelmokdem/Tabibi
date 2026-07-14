using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddPremiumAiMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvailablePremiumAiMessages",
                table: "PatientQuotas",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailablePremiumAiMessages",
                table: "PatientQuotas");
        }
    }
}
