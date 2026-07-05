using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;

namespace Tabibi.Services
{
    public class AdminService(AppDbContext dbContext, UserManager<AppUser> userManager)
    {
        public async Task<AdminDashboardDTO> GetDashboard()
        {
            var totalPatients = (await userManager.GetUsersInRoleAsync(UserRoles.Patient)).Count;
            var totalDoctors = (await userManager.GetUsersInRoleAsync(UserRoles.Doctor)).Count;

            var pendingDoctors = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Where(d => !d.IsVerified)
                .Select(d => new PendingDoctorDTO
                {
                    UserId = d.UserId,
                    DoctorId = d.DoctorId,
                    FullName = d.User.FullName,
                    LicenseNumber = d.LicenseNumber,
                    ClinicLocation = d.ClinicLocation
                })
                .ToListAsync();

            var totalAppointments = await dbContext.Appointments.CountAsync();

            return new AdminDashboardDTO
            {
                TotalPatients = totalPatients,
                TotalDoctors = totalDoctors,
                PendingDoctorVerifications = pendingDoctors.Count,
                TotalAppointments = totalAppointments,
                PendingDoctors = pendingDoctors
            };
        }

        public async Task<List<PendingDoctorDTO>> GetPendingDoctors()
        {
            return await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Where(d => !d.IsVerified)
                .Select(d => new PendingDoctorDTO
                {
                    UserId = d.UserId,
                    DoctorId = d.DoctorId,
                    FullName = d.User.FullName,
                    LicenseNumber = d.LicenseNumber,
                    ClinicLocation = d.ClinicLocation
                })
                .ToListAsync();
        }

        public async Task<ServiceResult> VerifyDoctor(int doctorId, bool approve)
        {
            var doctor = await dbContext.DoctorProfiles.FirstOrDefaultAsync(d => d.DoctorId == doctorId);
            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor not found!");
            }

            
            doctor.IsVerified = approve;

            await dbContext.SaveChangesAsync();
            return ServiceResult.Success();
        }
    }
}
