using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Tabibi.Application.Interfaces;
using Tabibi.Core.Models;
using Tabibi.Application.Shared;

namespace Tabibi.Infrastructure.Data.Seeders
{
    public class DataSeeder : IDataSeeder
    {
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly UserManager<AppUser> _userManager;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public DataSeeder(
            RoleManager<IdentityRole> roleManager,
            UserManager<AppUser> userManager,
            AppDbContext context,
            IConfiguration configuration)
        {
            _roleManager = roleManager;
            _userManager = userManager;
            _context = context;
            _configuration = configuration;
        }

        public async Task SeedAllAsync()
        {
            await SeedRolesAndAdminAsync();
            await SeedSpecialtiesAsync();
        }

        private async Task SeedRolesAndAdminAsync()
        {
            if (!await _roleManager.RoleExistsAsync(UserRoles.Patient))
            {
                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Patient));
            }

            if (!await _roleManager.RoleExistsAsync(UserRoles.Doctor))
            {
                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Doctor));
            }

            if (!await _roleManager.RoleExistsAsync(UserRoles.Admin))
            {
                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Admin));
            }

            var existingAdmins = await _userManager.GetUsersInRoleAsync(UserRoles.Admin);
            if (existingAdmins.Count == 0)
            {
                var adminEmail = _configuration["AdminSeed:Email"] ?? "admin@admin.com";
                var adminPassword = _configuration["AdminSeed:Password"] ?? "Admin@123";
                var adminFullName = _configuration["AdminSeed:FullName"] ?? "Admin";

                if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword))
                {
                    var existingUser = await _userManager.FindByEmailAsync(adminEmail);
                    if (existingUser != null)
                    {
                        if (!await _userManager.IsInRoleAsync(existingUser, UserRoles.Admin))
                        {
                            await _userManager.AddToRoleAsync(existingUser, UserRoles.Admin);
                        }
                    }
                    else
                    {
                        var adminUser = new AppUser
                        {
                            UserName = adminEmail,
                            Email = adminEmail,
                            FullName = adminFullName,
                            EmailConfirmed = true,
                            PhoneNumber = "0000000000",
                            PhoneNumberConfirmed = true
                        };

                        var createResult = await _userManager.CreateAsync(adminUser, adminPassword);
                        if (createResult.Succeeded)
                        {
                            await _userManager.AddToRoleAsync(adminUser, UserRoles.Admin);
                        }
                    }
                }
            }
        }

        private async Task SeedSpecialtiesAsync()
        {
            var predefinedSpecialties = new List<Specialty>
            {
                new Specialty { Id = 1, Name = "Dermatology (Skin)" },
                new Specialty { Id = 2, Name = "Dentistry (Teeth)" },
                new Specialty { Id = 3, Name = "Psychiatry (Mental Health)" },
                new Specialty { Id = 4, Name = "Pediatrics and New Born (Child)" },
                new Specialty { Id = 5, Name = "Neurology (Brain & Nerves)" },
                new Specialty { Id = 6, Name = "Orthopedics (Bones)" },
                new Specialty { Id = 7, Name = "Gynaecology and Infertility (Women's Health)" },
                new Specialty { Id = 8, Name = "Ear, Nose and Throat (ENT)" },
                new Specialty { Id = 9, Name = "Cardiology and Vascular Disease (Heart)" },
                new Specialty { Id = 10, Name = "Allergy and Immunology (Immune System)" },
                new Specialty { Id = 11, Name = "Andrology and Male Infertility (Men's Health)" },
                new Specialty { Id = 12, Name = "Audiology (Hearing)" },
                new Specialty { Id = 13, Name = "Cardiology and Thoracic Surgery (Heart & Chest)" },
                new Specialty { Id = 14, Name = "Chest and Respiratory (Lungs)" },
                new Specialty { Id = 15, Name = "Diabetes and Endocrinology (Glands & Hormones)" },
                new Specialty { Id = 16, Name = "Diagnostic Radiology (X-Ray/Imaging)" },
                new Specialty { Id = 17, Name = "Dietitian and Nutrition (Diet)" },
                new Specialty { Id = 18, Name = "Family Medicine (General Practice)" },
                new Specialty { Id = 19, Name = "Gastroenterology and Endoscopy (Digestive System)" },
                new Specialty { Id = 20, Name = "General Practice (General)" },
                new Specialty { Id = 21, Name = "General Surgery (Surgery)" },
                new Specialty { Id = 22, Name = "Geriatrics (Elderly Care)" },
                new Specialty { Id = 23, Name = "Hematology (Blood)" },
                new Specialty { Id = 24, Name = "Hepatology (Liver)" },
                new Specialty { Id = 25, Name = "Internal Medicine (Internal Organs)" },
                new Specialty { Id = 26, Name = "Interventional Radiology (Imaging/Procedures)" },
                new Specialty { Id = 27, Name = "IVF and Infertility (Fertility)" },
                new Specialty { Id = 28, Name = "Laboratories (Lab Tests)" },
                new Specialty { Id = 29, Name = "Nephrology (Kidneys)" },
                new Specialty { Id = 30, Name = "Neurosurgery (Brain & Spine Surgery)" },
                new Specialty { Id = 31, Name = "Obesity and Laparoscopic Surgery (Weight Loss)" },
                new Specialty { Id = 32, Name = "Oncology (Cancer)" },
                new Specialty { Id = 33, Name = "Oncology Surgery (Cancer Surgery)" },
                new Specialty { Id = 34, Name = "Ophthalmology (Eyes)" },
                new Specialty { Id = 35, Name = "Osteopathy (Bone & Muscle System)" },
                new Specialty { Id = 36, Name = "Pain Management (Pain Relief)" },
                new Specialty { Id = 37, Name = "Pediatric Surgery (Child Surgery)" },
                new Specialty { Id = 38, Name = "Phoniatrics (Speech & Voice)" },
                new Specialty { Id = 39, Name = "Physiotherapy and Sport Injuries (Physical Therapy)" },
                new Specialty { Id = 40, Name = "Plastic Surgery (Cosmetic Surgery)" },
                new Specialty { Id = 41, Name = "Rheumatology (Joints & Muscles)" },
                new Specialty { Id = 42, Name = "Spinal Surgery (Spine)" },
                new Specialty { Id = 43, Name = "Urology (Urinary Tract)" },
                new Specialty { Id = 44, Name = "Vascular Surgery (Blood Vessels)" }
            };

            foreach (var specialty in predefinedSpecialties)
            {
                if (!await _context.Specialties.AnyAsync(s => s.Id == specialty.Id))
                {
                    _context.Specialties.Add(specialty);
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
