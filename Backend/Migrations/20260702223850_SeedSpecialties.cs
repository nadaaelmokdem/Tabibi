using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class SeedSpecialties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Specialties",
                columns: new[] { "SpecialtyId", "Description", "IconUrl", "Keywords", "Name" },
                values: new object[,]
                {
                    { 1, null, null, null, "Cardiology" },
                    { 2, null, null, null, "Dermatology" },
                    { 3, null, null, null, "Endocrinology" },
                    { 4, null, null, null, "Gastroenterology" },
                    { 5, null, null, null, "Hematology" },
                    { 6, null, null, null, "Infectious Disease" },
                    { 7, null, null, null, "Nephrology" },
                    { 8, null, null, null, "Neurology" },
                    { 9, null, null, null, "Oncology" },
                    { 10, null, null, null, "Pulmonology" },
                    { 11, null, null, null, "Rheumatology" },
                    { 12, null, null, null, "Pediatrics" },
                    { 13, null, null, null, "Psychiatry" },
                    { 14, null, null, null, "Surgery" },
                    { 15, null, null, null, "Orthopedics" },
                    { 16, null, null, null, "Ophthalmology" },
                    { 17, null, null, null, "Otolaryngology (ENT)" },
                    { 18, null, null, null, "Urology" },
                    { 19, null, null, null, "Gynecology" },
                    { 20, null, null, null, "Obstetrics" },
                    { 21, null, null, null, "Anesthesiology" },
                    { 22, null, null, null, "Radiology" },
                    { 23, null, null, null, "Pathology" },
                    { 24, null, null, null, "Emergency Medicine" },
                    { 25, null, null, null, "Family Medicine" },
                    { 26, null, null, null, "Internal Medicine" },
                    { 27, null, null, null, "General Practice" },
                    { 28, null, null, null, "Allergy and Immunology" },
                    { 29, null, null, null, "Medical Genetics" },
                    { 30, null, null, null, "Physical Medicine and Rehabilitation" },
                    { 31, null, null, null, "Preventative Medicine" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 31);
        }
    }
}
