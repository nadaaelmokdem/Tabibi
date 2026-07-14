using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotasAndBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCompanyPaid",
                table: "ChatSessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsFollowUp",
                table: "ChatSessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "PatientQuotas",
                columns: table => new
                {
                    QuotaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientId = table.Column<int>(type: "int", nullable: false),
                    AvailableAiMessages = table.Column<int>(type: "int", nullable: false),
                    LastAiMessageReset = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AvailableFreeGpMessages = table.Column<int>(type: "int", nullable: false),
                    LastFreeGpMessageReset = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientQuotas", x => x.QuotaId);
                    table.ForeignKey(
                        name: "FK_PatientQuotas_PatientProfiles_PatientId",
                        column: x => x.PatientId,
                        principalTable: "PatientProfiles",
                        principalColumn: "PatientId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientQuotas_PatientId",
                table: "PatientQuotas",
                column: "PatientId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientQuotas");

            migrationBuilder.DropColumn(
                name: "IsCompanyPaid",
                table: "ChatSessions");

            migrationBuilder.DropColumn(
                name: "IsFollowUp",
                table: "ChatSessions");
        }
    }
}
