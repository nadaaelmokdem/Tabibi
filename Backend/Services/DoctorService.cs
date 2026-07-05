using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.Models;
using Tabibi.DTOs;

namespace Tabibi.Services
{
    public class DoctorService(AppDbContext dbContext)
    {
        /// <summary>
        /// Calculate and set prices for a doctor specialty based on clinic price
        /// Resets to default prices and clears custom flags
        /// </summary>
        public void SetSpecialtyPrices(DoctorSpecialty specialty, decimal clinicPrice)
        {
            specialty.ClinicPrice = clinicPrice;
            specialty.CalculatePrices();
        }

        /// <summary>
        /// Set a custom price for a specialty's consultation type
        /// Returns true if successful, false if price exceeds ceiling
        /// </summary>
        public bool SetCustomSpecialtyPrice(DoctorSpecialty specialty, ConsultationType type, decimal customPrice)
        {
            return specialty.TrySetCustomPrice(type, customPrice);
        }

        /// <summary>
        /// Get the maximum allowed price (ceiling) for a consultation type
        /// This is the default percentage applied to clinic price
        /// </summary>
        public decimal GetMaxPriceForConsultationType(DoctorSpecialty specialty, ConsultationType type)
        {
            return specialty.GetMaxPriceForType(type);
        }

        /// <summary>
        /// Get the default price for a consultation type (before any customization)
        /// </summary>
        public decimal GetDefaultPriceForConsultationType(DoctorSpecialty specialty, ConsultationType type)
        {
            return specialty.GetDefaultPriceForType(type);
        }

        /// <summary>
        /// Get price for a specific consultation type for a doctor's specialty
        /// </summary>
        public decimal GetConsultationPrice(DoctorSpecialty specialty, ConsultationType type)
        {
            return specialty.GetPriceByType(type);
        }

        /// <summary>
        /// Get the default percentage (ceiling) for a consultation type
        /// </summary>
        public static decimal GetDefaultPercentage(ConsultationType type)
        {
            return DoctorSpecialty.GetDefaultPercentage(type);
        }

        /// <summary>
        /// Reset specialty prices to defaults and clear custom flags
        /// </summary>
        public void ResetSpecialtyPrices(DoctorSpecialty specialty)
        {
            specialty.CalculatePrices();
        }

        /// <summary>
        /// Update specialty prices with validation
        /// Prices must not exceed ceiling (default percentage of clinic price)
        /// </summary>
        public UpdateSpecialtyPriceResponseDTO UpdateSpecialtyPrices(DoctorSpecialty specialty, UpdateSpecialtyPriceDTO updateDTO)
        {
            var response = new UpdateSpecialtyPriceResponseDTO { Success = true };
            var errors = new Dictionary<string, string>();

            // Update clinic price if provided
            if (updateDTO.ClinicPrice.HasValue)
            {
                if (updateDTO.ClinicPrice.Value <= 0)
                {
                    errors["ClinicPrice"] = "Clinic price must be greater than 0";
                }
                else
                {
                    specialty.ClinicPrice = updateDTO.ClinicPrice.Value;
                    // Reset other prices when clinic price changes
                    specialty.CalculatePrices();
                }
            }

            // Update chat price if provided
            if (updateDTO.ChatPrice.HasValue)
            {
                if (updateDTO.ChatPrice.Value < 0)
                {
                    errors["ChatPrice"] = "Chat price cannot be negative";
                }
                else if (!specialty.TrySetCustomPrice(ConsultationType.Chat, updateDTO.ChatPrice.Value))
                {
                    decimal maxPrice = specialty.GetMaxPriceForType(ConsultationType.Chat);
                    errors["ChatPrice"] = $"Chat price cannot exceed {maxPrice:C} (40% of clinic price)";
                }
            }

            // Update video price if provided
            if (updateDTO.VideoPrice.HasValue)
            {
                if (updateDTO.VideoPrice.Value < 0)
                {
                    errors["VideoPrice"] = "Video price cannot be negative";
                }
                else if (!specialty.TrySetCustomPrice(ConsultationType.Video, updateDTO.VideoPrice.Value))
                {
                    decimal maxPrice = specialty.GetMaxPriceForType(ConsultationType.Video);
                    errors["VideoPrice"] = $"Video price cannot exceed {maxPrice:C} (60% of clinic price)";
                }
            }

            // Update call price if provided
            if (updateDTO.CallPrice.HasValue)
            {
                if (updateDTO.CallPrice.Value < 0)
                {
                    errors["CallPrice"] = "Call price cannot be negative";
                }
                else if (!specialty.TrySetCustomPrice(ConsultationType.Call, updateDTO.CallPrice.Value))
                {
                    decimal maxPrice = specialty.GetMaxPriceForType(ConsultationType.Call);
                    errors["CallPrice"] = $"Call price cannot exceed {maxPrice:C} (60% of clinic price)";
                }
            }

            if (errors.Count > 0)
            {
                response.Success = false;
                response.Message = "Some prices failed validation";
                response.Errors = errors;
            }
            else
            {
                response.Message = "Prices updated successfully";
                response.UpdatedSpecialty = ConvertToSpecialtyPriceDTO(specialty);
            }

            return response;
        }

        /// <summary>
        /// Convert DoctorSpecialty to SpecialtyPriceDTO
        /// </summary>
        public SpecialtyPriceDTO ConvertToSpecialtyPriceDTO(DoctorSpecialty specialty)
        {
            return new SpecialtyPriceDTO
            {
                DoctorSpecialtyId = specialty.Id,
                SpecialtyId = specialty.SpecialtyId,
                SpecialtyName = specialty.Specialty.Name,
                SpecialtyDescription = specialty.Specialty.Description,
                SpecialtyIconUrl = specialty.Specialty.IconUrl,
                IsPrimary = specialty.IsPrimary,
                ClinicPrice = specialty.ClinicPrice,
                ChatPrice = specialty.ChatPrice,
                VideoPrice = specialty.VideoPrice,
                CallPrice = specialty.CallPrice,
                IsCustomChatPrice = specialty.IsCustomChatPrice,
                IsCustomVideoPrice = specialty.IsCustomVideoPrice,
                IsCustomCallPrice = specialty.IsCustomCallPrice,
                MaxChatPrice = specialty.GetMaxPriceForType(ConsultationType.Chat),
                MaxVideoPrice = specialty.GetMaxPriceForType(ConsultationType.Video),
                MaxCallPrice = specialty.GetMaxPriceForType(ConsultationType.Call),
                ChatPercentage = DoctorSpecialty.GetDefaultPercentage(ConsultationType.Chat),
                VideoPercentage = DoctorSpecialty.GetDefaultPercentage(ConsultationType.Video),
                CallPercentage = DoctorSpecialty.GetDefaultPercentage(ConsultationType.Call),
                CreatedAt = specialty.CreatedAt,
                UpdatedAt = specialty.UpdatedAt
            };
        }

        /// <summary>
        /// Convert DoctorProfile with specialties to DoctorProfileDTO
        /// </summary>
        public DoctorProfileDTO ConvertToDoctorProfileDTO(DoctorProfile doctor)
        {
            return new DoctorProfileDTO
            {
                DoctorId = doctor.DoctorId,
                UserId = doctor.UserId,
                FullName = doctor.User?.FullName ?? "",
                Email = doctor.User?.Email ?? "",
                LicenseNumber = doctor.LicenseNumber,
                NationalIdNumber = doctor.NationalIdNumber,
                ClinicLocation = doctor.ClinicLocation,
                ClinicPhoneNumber = doctor.ClinicPhoneNumber,
                LicenseProofUrl = doctor.LicenseProofUrl,
                LicenseExpiryDate = doctor.LicenseExpiryDate,
                YearsOfExperience = doctor.YearsOfExperience,
                Bio = doctor.Bio,
                ProfilePictureUrl = doctor.ProfilePictureUrl,
                AverageRating = doctor.AverageRating,
                IsVerified = doctor.IsVerified,
                IsAvailableNow = doctor.IsAvailableNow,
                Specialties = doctor.DoctorSpecialties
                    .Select(ConvertToSpecialtyPriceDTO)
                    .ToList()
            };
        }

        public async Task<DoctorProfileDTO?> GetProfile(string userId)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null) return null;

            return ConvertToDoctorProfileDTO(doctor);
        }

        public async Task<ServiceResult> UpdateProfileField(string userId, string fieldName, string value)
        {
            var doctor = await dbContext.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor profile not found!");
            }

            try
            {
                switch (fieldName.ToLower())
                {
                    case "licensenumber":
                        if (doctor.LicenseNumber != value)
                        {
                            doctor.LicenseNumber = value;
                            doctor.IsVerified = false;
                        }
                        break;
                    case "nationalidnumber":
                        if (doctor.NationalIdNumber != value)
                        {
                            doctor.NationalIdNumber = value;
                            doctor.IsVerified = false;
                        }
                        break;
                    case "cliniclocation":
                        doctor.ClinicLocation = value;
                        break;
                    case "clinicphonenumber":
                        doctor.ClinicPhoneNumber = value;
                        break;
                    case "bio":
                        doctor.Bio = value;
                        break;
                    case "yearsofexperience":
                        if (int.TryParse(value, out int years))
                        {
                            doctor.YearsOfExperience = years;
                        }
                        break;
                    case "licenseexpirydate":
                        if (DateTime.TryParse(value, out DateTime expiry))
                        {
                            doctor.LicenseExpiryDate = expiry;
                        }
                        break;
                    default:
                        return ServiceResult.Failure("Field doesn't exist or cannot be updated via this endpoint!");
                }

                await dbContext.SaveChangesAsync();
                return ServiceResult.Success();
            }
            catch (Exception ex)
            {
                return ServiceResult.Failure(ex.Message);
            }
        }
         public async Task<DoctorDashboardDTO?> GetDashboard(string userId)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null) return null;

            var pendingChatRequests = await dbContext.ChatSessions
                .Include(cs => cs.Patient).ThenInclude(p => p.User)
                .Include(cs => cs.SymptomAnalysis)
                .Where(cs => cs.DoctorId == doctor.DoctorId && cs.DoctorAccepted == null)
                .OrderBy(cs => cs.StartedAt)
                .Take(10)
                .Select(cs => new PendingChatRequestDTO
                {
                    SessionId = cs.SessionId,
                    PatientName = cs.Patient.User.FullName,
                    SessionSummary = cs.SessionSummary,
                    StartedAt = cs.StartedAt
                })
                .ToListAsync();

            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todaysAppointments = await dbContext.Appointments
                .Where(a => a.DoctorId == doctor.DoctorId && a.ScheduledAt >= todayStart && a.ScheduledAt < todayEnd)
                .OrderBy(a => a.ScheduledAt)
                .Select(a => new UpcomingAppointmentDTO
                {
                    AppointmentId = a.AppointmentId,
                    DoctorName = doctor.User.FullName,
                    ScheduledAt = a.ScheduledAt,
                    ConsultationType = a.ConsultationType.ToString(),
                    Status = a.Status.ToString()
                })
                .ToListAsync();

            var totalPatientsSeen = await dbContext.Appointments
                .Where(a => a.DoctorId == doctor.DoctorId && a.Status == AppointmentStatus.Completed)
                .Select(a => a.PatientId)
                .Distinct()
                .CountAsync();

            return new DoctorDashboardDTO
            {
                FullName = doctor.User.FullName,
                IsVerified = doctor.IsVerified,
                PendingChatRequestsCount = pendingChatRequests.Count,
                TodaysAppointmentsCount = todaysAppointments.Count,
                TotalPatientsSeen = totalPatientsSeen,
                PendingChatRequests = pendingChatRequests,
                TodaysAppointments = todaysAppointments
            };
        }


    }
}
