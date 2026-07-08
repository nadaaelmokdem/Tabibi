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
                .Where(d => d.VerificationStatus == DoctorVerificationStatus.Pending)
                .Select(d => new PendingDoctorDTO
                {
                    UserId = d.UserId,
                    DoctorId = d.DoctorId,
                    FullName = d.User.FullName,
                    LicenseNumber = d.LicenseNumber ?? "",
                    ClinicLocation = d.ClinicLocation ?? "",
                    VerificationStatus = d.VerificationStatus.ToString()
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
                .Where(d => d.VerificationStatus == DoctorVerificationStatus.Pending)
                .Select(d => new PendingDoctorDTO
                {
                    UserId = d.UserId,
                    DoctorId = d.DoctorId,
                    FullName = d.User.FullName,
                    LicenseNumber = d.LicenseNumber ?? "",
                    ClinicLocation = d.ClinicLocation ?? "",
                    VerificationStatus = d.VerificationStatus.ToString()
                })
                .ToListAsync();
        }

        public async Task<List<AdminDoctorDTO>> GetAllDoctors(DoctorVerificationStatus? status = null)
        {
            var query = dbContext.DoctorProfiles.Include(d => d.User).AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(d => d.VerificationStatus == status.Value);
            }

            return await query
                .OrderByDescending(d => d.ReviewedAt)
                .Select(d => new AdminDoctorDTO
                {
                    DoctorId = d.DoctorId,
                    UserId = d.UserId,
                    FullName = d.User.FullName,
                    Email = d.User.Email ?? "",
                    LicenseNumber = d.LicenseNumber ?? "",
                    ClinicLocation = d.ClinicLocation ?? "",
                    YearsOfExperience = d.YearsOfExperience ?? 0,
                    VerificationStatus = d.VerificationStatus.ToString(),
                    AdminComment = d.AdminComment,
                    ReviewedAt = d.ReviewedAt,
                    IsActive = d.User.IsActive
                })
                .ToListAsync();
        }

        public async Task<ServiceResult> VerifyDoctor(int doctorId, DoctorVerificationStatus decision, string? comment)
        {
            if (decision == DoctorVerificationStatus.Pending)
            {
                return ServiceResult.Failure($"Decision must be one of: {DoctorVerificationStatus.Approved}, {DoctorVerificationStatus.Rejected}, {DoctorVerificationStatus.NeedsChanges}.");
            }

            if (decision != DoctorVerificationStatus.Approved && string.IsNullOrWhiteSpace(comment))
            {
                return ServiceResult.Failure("A comment is required when rejecting or requesting changes.");
            }

            var doctor = await dbContext.DoctorProfiles.FirstOrDefaultAsync(d => d.DoctorId == doctorId);
            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor not found!");
            }

            doctor.VerificationStatus = decision;
            doctor.AdminComment = comment;
            doctor.ReviewedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();
            return ServiceResult.Success();
        }

        public async Task<List<AdminUserDTO>> GetAllUsers()
        {
            var users = await dbContext.Users.ToListAsync();

            var roleByUser = await (
                from ur in dbContext.UserRoles
                join r in dbContext.Roles on ur.RoleId equals r.Id
                select new { ur.UserId, RoleName = r.Name }
            ).GroupBy(x => x.UserId)
             .ToDictionaryAsync(g => g.Key, g => string.Join(", ", g.Select(x => x.RoleName)));

            var spendByPatientUserId = await dbContext.Payments
                .Where(p => p.Status == PaymentStatus.Paid)
                .Select(p => new { p.Amount, p.Appointment.Patient.UserId })
                .GroupBy(x => x.UserId)
                .Select(g => new { UserId = g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.UserId, x => x.Total);

            return users.Select(u => new AdminUserDTO
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? "",
                PhoneNumber = u.PhoneNumber ?? "",
                Role = roleByUser.TryGetValue(u.Id, out var role) ? role : string.Empty,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                TotalSpent = spendByPatientUserId.TryGetValue(u.Id, out var total) ? total : null
            }).ToList();
        }

        public async Task<ServiceResult> SetUserActive(string userId, bool isActive)
        {
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return ServiceResult.Failure("User not found!");
            }

            user.IsActive = isActive;
            await dbContext.SaveChangesAsync();
            return ServiceResult.Success();
        }

        public async Task<List<AdminAppointmentDTO>> GetAppointments()
        {
            return await dbContext.Appointments
                .Include(a => a.Patient).ThenInclude(p => p.User)
                .Include(a => a.Doctor).ThenInclude(d => d.User)
                .Include(a => a.Payment)
                .OrderByDescending(a => a.ScheduledAt)
                .Select(a => new AdminAppointmentDTO
                {
                    AppointmentId = a.AppointmentId,
                    PatientName = a.Patient.User.FullName,
                    DoctorName = a.Doctor.User.FullName,
                    ScheduledAt = a.ScheduledAt,
                    ConsultationType = a.ConsultationType.ToString(),
                    Status = a.Status.ToString(),
                    Price = a.Price,
                    PaymentStatus = a.Payment != null ? a.Payment.Status.ToString() : null,
                    AmountPaid = a.Payment != null && a.Payment.Status == PaymentStatus.Paid ? a.Payment.Amount : null
                })
                .ToListAsync();
        }

    }
}
