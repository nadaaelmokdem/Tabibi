using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveChatSessionSpecialtyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatSessions_Specialties_SpecialtyId",
                table: "ChatSessions");

            migrationBuilder.DropIndex(
                name: "IX_ChatSessions_SpecialtyId",
                table: "ChatSessions");

            migrationBuilder.DropColumn(
                name: "SpecialtyId",
                table: "ChatSessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SpecialtyId",
                table: "ChatSessions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_SpecialtyId",
                table: "ChatSessions",
                column: "SpecialtyId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatSessions_Specialties_SpecialtyId",
                table: "ChatSessions",
                column: "SpecialtyId",
                principalTable: "Specialties",
                principalColumn: "SpecialtyId");
        }
    }
}
