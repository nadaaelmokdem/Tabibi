using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;

namespace Tabibi.Services
{
    public class AdminService(AppDbContext dbContext, UserManager<AppUser> userManager, IFileService fileService)
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

            var doctors = await query
                .OrderByDescending(d => d.ReviewedAt)
                .ToListAsync();

            var doctorIds = doctors.Select(d => d.DoctorId).ToList();

            var changeStats = await dbContext.DoctorProfileChangeLogs
                .Where(l => doctorIds.Contains(l.DoctorId))
                .GroupBy(l => l.DoctorId)
                .Select(g => new
                {
                    DoctorId = g.Key,
                    LastChangedAt = g.Max(x => x.ChangedAt)
                })
                .ToDictionaryAsync(x => x.DoctorId, x => x.LastChangedAt);

            var pendingChangeCounts = new Dictionary<int, int>();
            foreach (var doctor in doctors)
            {
                var pendingQuery = dbContext.DoctorProfileChangeLogs
                    .Where(l => l.DoctorId == doctor.DoctorId);

                if (doctor.ReviewedAt.HasValue)
                {
                    pendingQuery = pendingQuery.Where(l => l.ChangedAt > doctor.ReviewedAt.Value);
                }

                pendingChangeCounts[doctor.DoctorId] = await pendingQuery.CountAsync();
            }

            return doctors.Select(d => new AdminDoctorDTO
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
                IsActive = d.User.IsActive,
                PendingChangesCount = pendingChangeCounts.GetValueOrDefault(d.DoctorId),
                LastChangedAt = changeStats.GetValueOrDefault(d.DoctorId)
            }).ToList();
        }

        public async Task<AdminDoctorDetailDTO?> GetDoctorDetail(int doctorId)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .Include(d => d.OldSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

            if (doctor == null) return null;

            return new AdminDoctorDetailDTO
            {
                DoctorId = doctor.DoctorId,
                UserId = doctor.UserId,
                FullName = doctor.User.FullName,
                Email = doctor.User.Email ?? "",
                LicenseNumber = doctor.LicenseNumber,
                NationalIdNumber = doctor.NationalIdNumber,
                ClinicLocation = doctor.ClinicLocation,
                ClinicPhoneNumber = doctor.ClinicPhoneNumber,
                LicenseProofUrl = doctor.LicenseProofUrl,
                IdProofUrl = doctor.IdProofUrl,
                DegreeProofUrl = doctor.DegreeProofUrl,
                LicenseExpiryDate = doctor.LicenseExpiryDate,
                YearsOfExperience = doctor.YearsOfExperience,
                Bio = doctor.Bio,
                VerificationStatus = doctor.VerificationStatus.ToString(),
                AdminComment = doctor.AdminComment,
                ReviewedAt = doctor.ReviewedAt,
                Specialties = doctor.DoctorSpecialties.Select(ds => new SpecialtyDTO
                {
                    SpecialtyId = ds.SpecialtyId,
                    Name = ds.Specialty?.Name ?? ""
                }).ToList(),
                OldLicenseNumber = doctor.OldLicenseNumber,
                OldNationalIdNumber = doctor.OldNationalIdNumber,
                OldLicenseProofUrl = doctor.OldLicenseProofUrl,
                OldIdProofUrl = doctor.OldIdProofUrl,
                OldDegreeProofUrl = doctor.OldDegreeProofUrl,
                OldLicenseExpiryDate = doctor.OldLicenseExpiryDate,
                OldSpecialties = doctor.OldSpecialties.Select(ds => new SpecialtyDTO
                {
                    SpecialtyId = ds.SpecialtyId,
                    Name = ds.Specialty?.Name ?? ""
                }).ToList()
            };
        }

        public async Task<List<DoctorProfileChangeLogDTO>> GetDoctorChanges(int doctorId)
        {
            var doctor = await dbContext.DoctorProfiles.FirstOrDefaultAsync(d => d.DoctorId == doctorId);
            if (doctor == null) return new List<DoctorProfileChangeLogDTO>();

            var query = dbContext.DoctorProfileChangeLogs
                .Where(l => l.DoctorId == doctorId);

            if (doctor.ReviewedAt.HasValue)
            {
                query = query.Where(l => l.ChangedAt > doctor.ReviewedAt.Value);
            }

            return await query
                .OrderByDescending(l => l.ChangedAt)
                .Select(l => new DoctorProfileChangeLogDTO
                {
                    ChangeLogId = l.ChangeLogId,
                    FieldName = l.FieldName,
                    OldValue = l.OldValue,
                    NewValue = l.NewValue,
                    ChangedAt = l.ChangedAt
                })
                .ToListAsync();
        }

        public async Task<ServiceResult> VerifyDoctor(int doctorId, ReviewDoctorRequestDTO request)
        {
            if (request.Decision == DoctorVerificationStatus.Pending)
            {
                return ServiceResult.Failure($"Decision must be one of: {DoctorVerificationStatus.Approved}, {DoctorVerificationStatus.Rejected}, {DoctorVerificationStatus.NeedsChanges}.");
            }

            if (request.Decision != DoctorVerificationStatus.Approved && string.IsNullOrWhiteSpace(request.Comment) && !request.BanDoctor)
            {
                return ServiceResult.Failure("A comment is required when rejecting or requesting changes.");
            }

            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .Include(d => d.OldSpecialties)
                .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor not found!");
            }

            if (request.BanDoctor)
            {
                doctor.VerificationStatus = DoctorVerificationStatus.Rejected;
                doctor.AdminComment = request.Comment ?? "Your account has been rejected completely. Please contact support.";
                doctor.User.IsActive = false;
            }
            else if (request.RevertToOldData)
            {
                doctor.LicenseNumber = doctor.OldLicenseNumber;
                doctor.NationalIdNumber = doctor.OldNationalIdNumber;
                doctor.LicenseProofUrl = doctor.OldLicenseProofUrl;
                doctor.IdProofUrl = doctor.OldIdProofUrl;
                doctor.DegreeProofUrl = doctor.OldDegreeProofUrl;
                doctor.LicenseExpiryDate = doctor.OldLicenseExpiryDate;

                dbContext.DoctorSpecialties.RemoveRange(doctor.DoctorSpecialties);
                doctor.DoctorSpecialties.Clear();

                foreach (var ds in doctor.OldSpecialties)
                {
                    doctor.DoctorSpecialties.Add(new DoctorSpecialty
                    {
                        DoctorId = doctor.DoctorId,
                        SpecialtyId = ds.SpecialtyId
                    });
                }

                doctor.VerificationStatus = DoctorVerificationStatus.Approved;
                doctor.AdminComment = "Your recent changes were reverted to the last approved state. You are still approved.";
            }
            else
            {
                doctor.VerificationStatus = request.Decision;
                doctor.AdminComment = request.Comment;
            }

            if (doctor.VerificationStatus == DoctorVerificationStatus.Approved || request.RevertToOldData)
            {
                if (request.RevertToOldData)
                {
                    if (!string.IsNullOrEmpty(doctor.LicenseProofUrl) && doctor.LicenseProofUrl != doctor.OldLicenseProofUrl)
                        await fileService.DeleteFileAsync(doctor.LicenseProofUrl);
                    if (!string.IsNullOrEmpty(doctor.IdProofUrl) && doctor.IdProofUrl != doctor.OldIdProofUrl)
                        await fileService.DeleteFileAsync(doctor.IdProofUrl);
                    if (!string.IsNullOrEmpty(doctor.DegreeProofUrl) && doctor.DegreeProofUrl != doctor.OldDegreeProofUrl)
                        await fileService.DeleteFileAsync(doctor.DegreeProofUrl);
                }
                else if (doctor.VerificationStatus == DoctorVerificationStatus.Approved)
                {
                    if (!string.IsNullOrEmpty(doctor.OldLicenseProofUrl) && doctor.OldLicenseProofUrl != doctor.LicenseProofUrl)
                        await fileService.DeleteFileAsync(doctor.OldLicenseProofUrl);
                    if (!string.IsNullOrEmpty(doctor.OldIdProofUrl) && doctor.OldIdProofUrl != doctor.IdProofUrl)
                        await fileService.DeleteFileAsync(doctor.OldIdProofUrl);
                    if (!string.IsNullOrEmpty(doctor.OldDegreeProofUrl) && doctor.OldDegreeProofUrl != doctor.DegreeProofUrl)
                        await fileService.DeleteFileAsync(doctor.OldDegreeProofUrl);
                }

                // Clear old fields when approved or reverted (they are now the active fields)
                doctor.OldLicenseNumber = null;
                doctor.OldNationalIdNumber = null;
                doctor.OldLicenseProofUrl = null;
                doctor.OldIdProofUrl = null;
                doctor.OldDegreeProofUrl = null;
                doctor.OldLicenseExpiryDate = null;
                dbContext.DoctorOldSpecialties.RemoveRange(doctor.OldSpecialties);
                doctor.OldSpecialties.Clear();
            }

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
