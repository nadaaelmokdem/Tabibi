using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Tabibi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSpecialtiesAndPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Specialties");

            migrationBuilder.DropColumn(
                name: "IconUrl",
                table: "Specialties");

            migrationBuilder.DropColumn(
                name: "Keywords",
                table: "Specialties");

            migrationBuilder.DropColumn(
                name: "IsCustomCallPrice",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "IsCustomChatPrice",
                table: "DoctorSpecialties");

            migrationBuilder.DropColumn(
                name: "IsCustomVideoPrice",
                table: "DoctorSpecialties");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 1,
                column: "Name",
                value: "Dermatology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 2,
                column: "Name",
                value: "Dentistry");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 3,
                column: "Name",
                value: "Psychiatry");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 4,
                column: "Name",
                value: "Pediatrics and New Born");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 5,
                column: "Name",
                value: "Neurology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 6,
                column: "Name",
                value: "Orthopedics");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 7,
                column: "Name",
                value: "Gynaecology and Infertility");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 8,
                column: "Name",
                value: "Ear, Nose and Throat");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 9,
                column: "Name",
                value: "Cardiology and Vascular Disease");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 10,
                column: "Name",
                value: "Allergy and Immunology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 11,
                column: "Name",
                value: "Andrology and Male Infertility");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 12,
                column: "Name",
                value: "Audiology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 13,
                column: "Name",
                value: "Cardiology and Thoracic Surgery");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 14,
                column: "Name",
                value: "Chest and Respiratory");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 15,
                column: "Name",
                value: "Diabetes and Endocrinology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 16,
                column: "Name",
                value: "Diagnostic Radiology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 17,
                column: "Name",
                value: "Dietitian and Nutrition");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 18,
                column: "Name",
                value: "Family Medicine");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 19,
                column: "Name",
                value: "Gastroenterology and Endoscopy");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 20,
                column: "Name",
                value: "General Practice");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 21,
                column: "Name",
                value: "General Surgery");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 22,
                column: "Name",
                value: "Geriatrics");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 23,
                column: "Name",
                value: "Hematology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 24,
                column: "Name",
                value: "Hepatology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 25,
                column: "Name",
                value: "Internal Medicine");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 26,
                column: "Name",
                value: "Interventional Radiology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 27,
                column: "Name",
                value: "IVF and Infertility");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 28,
                column: "Name",
                value: "Laboratories");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 29,
                column: "Name",
                value: "Nephrology");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 30,
                column: "Name",
                value: "Neurosurgery");

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 31,
                column: "Name",
                value: "Obesity and Laparoscopic Surgery");

            migrationBuilder.InsertData(
                table: "Specialties",
                columns: new[] { "SpecialtyId", "Name" },
                values: new object[,]
                {
                    { 32, "Oncology" },
                    { 33, "Oncology Surgery" },
                    { 34, "Ophthalmology" },
                    { 35, "Osteopathy" },
                    { 36, "Pain Management" },
                    { 37, "Pediatric Surgery" },
                    { 38, "Phoniatrics" },
                    { 39, "Physiotherapy and Sport Injuries" },
                    { 40, "Plastic Surgery" },
                    { 41, "Rheumatology" },
                    { 42, "Spinal Surgery" },
                    { 43, "Urology" },
                    { 44, "Vascular Surgery" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 33);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 34);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 35);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 36);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 37);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 38);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 40);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 41);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 42);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 43);

            migrationBuilder.DeleteData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 44);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Specialties",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconUrl",
                table: "Specialties",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Keywords",
                table: "Specialties",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCustomCallPrice",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsCustomChatPrice",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsCustomVideoPrice",
                table: "DoctorSpecialties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 1,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Cardiology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 2,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Dermatology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 3,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Endocrinology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 4,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Gastroenterology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 5,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Hematology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 6,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Infectious Disease" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 7,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Nephrology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 8,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Neurology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 9,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Oncology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 10,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Pulmonology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 11,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Rheumatology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 12,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Pediatrics" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 13,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Psychiatry" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 14,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Surgery" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 15,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Orthopedics" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 16,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Ophthalmology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 17,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Otolaryngology (ENT)" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 18,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Urology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 19,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Gynecology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 20,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Obstetrics" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 21,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Anesthesiology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 22,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Radiology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 23,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Pathology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 24,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Emergency Medicine" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 25,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Family Medicine" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 26,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Internal Medicine" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 27,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "General Practice" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 28,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Allergy and Immunology" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 29,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Medical Genetics" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 30,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Physical Medicine and Rehabilitation" });

            migrationBuilder.UpdateData(
                table: "Specialties",
                keyColumn: "SpecialtyId",
                keyValue: 31,
                columns: new[] { "Description", "IconUrl", "Keywords", "Name" },
                values: new object[] { null, null, null, "Preventative Medicine" });
        }
    }
}
