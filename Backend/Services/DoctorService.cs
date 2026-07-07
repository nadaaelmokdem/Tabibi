using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.Shared;
using System.Text.Json;
using Tabibi.Models;
using Tabibi.DTOs;
using Tabibi.Extensions;

namespace Tabibi.Services
{
    public class DoctorService(AppDbContext dbContext)
    {
        public UpdateSpecialtyPriceResponseDTO UpdateSpecialtyPrices(DoctorSpecialty specialty, UpdateSpecialtyPriceDTO updateDTO)
        {
            var response = new UpdateSpecialtyPriceResponseDTO { Success = true };
            var errors = new Dictionary<string, string>();

            if (updateDTO.ClinicPrice.HasValue)
            {
                if (updateDTO.ClinicPrice.Value <= 0)
                    errors["ClinicPrice"] = "Clinic price must be greater than 0";
                else
                    specialty.ClinicPrice = updateDTO.ClinicPrice.Value;
            }

            if (updateDTO.ChatPrice.HasValue)
            {
                if (updateDTO.ChatPrice.Value < 0)
                    errors["ChatPrice"] = "Chat price cannot be negative";
                else if (updateDTO.ChatPrice.Value > specialty.ClinicPrice)
                    errors["ChatPrice"] = $"Chat price cannot exceed clinic price ({specialty.ClinicPrice:C})";
                else
                    specialty.ChatPrice = updateDTO.ChatPrice.Value;
            }

            if (updateDTO.VideoPrice.HasValue)
            {
                if (updateDTO.VideoPrice.Value < 0)
                    errors["VideoPrice"] = "Video price cannot be negative";
                else if (updateDTO.VideoPrice.Value > specialty.ClinicPrice)
                    errors["VideoPrice"] = $"Video price cannot exceed clinic price ({specialty.ClinicPrice:C})";
                else
                    specialty.VideoPrice = updateDTO.VideoPrice.Value;
            }

            if (updateDTO.CallPrice.HasValue)
            {
                if (updateDTO.CallPrice.Value < 0)
                    errors["CallPrice"] = "Call price cannot be negative";
                else if (updateDTO.CallPrice.Value > specialty.ClinicPrice)
                    errors["CallPrice"] = $"Call price cannot exceed clinic price ({specialty.ClinicPrice:C})";
                else
                    specialty.CallPrice = updateDTO.CallPrice.Value;
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
                response.UpdatedSpecialty = specialty.ToDTO();
            }

            return response;
        }

        public async Task<DoctorProfileDTO?> GetProfile(string userId)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null) return null;

            return doctor.ToDTO();
        }

        public async Task<ServiceResult> UpdateProfileField(string userId, string fieldName, string value)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.DoctorSpecialties)
                .FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor profile not found!");
            }

            try
            {
                switch (fieldName.ToLower())
                {
                    case "licensenumber":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        if (doctor.LicenseNumber != value)
                        {
                            doctor.LicenseNumber = value;
                        }
                        break;
                    case "nationalidnumber":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        if (doctor.NationalIdNumber != value)
                        {
                            doctor.NationalIdNumber = value;
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
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            doctor.YearsOfExperience = null;
                        }
                        else if (int.TryParse(value, out int years))
                        {
                            doctor.YearsOfExperience = years;
                        }
                        break;
                    case "licenseexpirydate":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        if (DateTime.TryParse(value, out DateTime expiry))
                        {
                            doctor.LicenseExpiryDate = expiry;
                        }
                        break;
                    case "specialties":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        List<SpecialtyWithPricesDTO> inputSpecialties = new();
                        try
                        {
                            inputSpecialties = JsonSerializer.Deserialize<List<SpecialtyWithPricesDTO>>(value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<SpecialtyWithPricesDTO>();
                        }
                        catch
                        {
                            // Fallback to comma separated string
                            var names = value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                            inputSpecialties = names.Select(n => new SpecialtyWithPricesDTO { SpecialtyName = n }).ToList();
                        }

                        var inputSpecialtyNames = inputSpecialties.Select(s => s.SpecialtyName).ToList();
                        
                        var allSpecialties = await dbContext.Specialties.Where(s => inputSpecialtyNames.Contains(s.Name)).ToListAsync();
                        var newSpecialtyIds = allSpecialties.Select(s => s.SpecialtyId).ToList();

                        var currentSpecialties = doctor.DoctorSpecialties.ToList();
                        var currentSpecialtyIds = currentSpecialties.Select(ds => ds.SpecialtyId).ToList();

                        var toRemove = currentSpecialties.Where(ds => !newSpecialtyIds.Contains(ds.SpecialtyId)).ToList();
                        dbContext.DoctorSpecialties.RemoveRange(toRemove);

                        var toAddIds = newSpecialtyIds.Where(id => !currentSpecialtyIds.Contains(id)).ToList();
                        foreach (var id in toAddIds)
                        {
                            var specDto = inputSpecialties.FirstOrDefault(s => s.SpecialtyName == allSpecialties.First(a => a.SpecialtyId == id).Name);
                            var ds = new DoctorSpecialty { DoctorId = doctor.DoctorId, SpecialtyId = id };
                            if (specDto != null)
                            {
                                ds.ClinicPrice = specDto.ClinicPrice;
                                ds.IsClinicEnabled = specDto.IsClinicEnabled;
                                ds.ChatPrice = specDto.ChatPrice;
                                ds.IsChatEnabled = specDto.IsChatEnabled;
                                ds.VideoPrice = specDto.VideoPrice;
                                ds.IsVideoEnabled = specDto.IsVideoEnabled;
                                ds.CallPrice = specDto.CallPrice;
                                ds.IsCallEnabled = specDto.IsCallEnabled;
                            }
                            else
                            {
                                ds.ClinicPrice = 500;
                            }
                            doctor.DoctorSpecialties.Add(ds);
                        }

                        // Also update existing ones if prices changed
                        var toUpdateIds = newSpecialtyIds.Where(id => currentSpecialtyIds.Contains(id)).ToList();
                        foreach (var id in toUpdateIds)
                        {
                            var ds = doctor.DoctorSpecialties.First(d => d.SpecialtyId == id);
                            var specDto = inputSpecialties.FirstOrDefault(s => s.SpecialtyName == allSpecialties.First(a => a.SpecialtyId == id).Name);
                            if (specDto != null)
                            {
                                ds.ClinicPrice = specDto.ClinicPrice;
                                ds.IsClinicEnabled = specDto.IsClinicEnabled;
                                ds.ChatPrice = specDto.ChatPrice;
                                ds.IsChatEnabled = specDto.IsChatEnabled;
                                ds.VideoPrice = specDto.VideoPrice;
                                ds.IsVideoEnabled = specDto.IsVideoEnabled;
                                ds.CallPrice = specDto.CallPrice;
                                ds.IsCallEnabled = specDto.IsCallEnabled;
                            }
                        }
                        break;
                    case "licenseproofurl":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        doctor.LicenseProofUrl = value;
                        break;
                    case "idproofurl":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        doctor.IdProofUrl = value;
                        break;
                    case "degreeproofurl":
                        if (doctor.IsVerified) return ServiceResult.Failure("Cannot edit sensitive data while verified.");
                        doctor.DegreeProofUrl = value;
                        break;
                    case "profilepictureurl":
                        doctor.ProfilePictureUrl = value;
                        break;
                    default:
                        return ServiceResult.Failure("Field doesn't exist or cannot be updated via this endpoint!");
                }

                // Editing a rejected/changes-requested profile counts as a resubmission -
                // send it back to the front of the admin's review queue.
                if (doctor.VerificationStatus is DoctorVerificationStatus.Rejected or DoctorVerificationStatus.NeedsChanges)
                {
                    doctor.VerificationStatus = DoctorVerificationStatus.Pending;
                }

                await dbContext.SaveChangesAsync();
                return ServiceResult.Success();
            }
            catch (Exception ex)
            {
                return ServiceResult.Failure(ex.Message);
            }
        }

        public async Task<ServiceResult<DoctorProfileDTO>> BulkUpdateProfile(string userId, DoctorProfileBulkUpdateDTO profileData)
        {
            var doctor = await dbContext.DoctorProfiles
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null)
            {
                return ServiceResult<DoctorProfileDTO>.Failure("Doctor profile not found!");
            }

            try
            {
                doctor.ClinicLocation = profileData.ClinicLocation;
                doctor.ClinicPhoneNumber = profileData.ClinicPhoneNumber;
                if (!string.IsNullOrEmpty(profileData.ProfilePictureUrl)) doctor.ProfilePictureUrl = profileData.ProfilePictureUrl;
                if (!string.IsNullOrEmpty(profileData.Bio)) doctor.Bio = profileData.Bio;
                if (profileData.YearsOfExperience >= 0) doctor.YearsOfExperience = profileData.YearsOfExperience;

                if (!doctor.IsVerified)
                {
                    doctor.LicenseNumber = profileData.LicenseNumber;
                    doctor.NationalIdNumber = profileData.NationalIdNumber;
                    if (!string.IsNullOrEmpty(profileData.LicenseProofUrl)) doctor.LicenseProofUrl = profileData.LicenseProofUrl;
                    if (!string.IsNullOrEmpty(profileData.IdProofUrl)) doctor.IdProofUrl = profileData.IdProofUrl;
                    if (!string.IsNullOrEmpty(profileData.DegreeProofUrl)) doctor.DegreeProofUrl = profileData.DegreeProofUrl;
                    if (profileData.LicenseExpiryDate.HasValue) doctor.LicenseExpiryDate = profileData.LicenseExpiryDate.Value;
                }

                if (!doctor.IsVerified)
                {
                    // Handle Specialties array mapping
                    if (profileData.Specialties != null && profileData.Specialties.Any())
                    {
                        // Find matching specialties by name
                        var requestedNames = profileData.Specialties.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim().ToLower()).ToList();
                        
                        var existingDbSpecialties = await dbContext.Specialties
                            .Where(s => requestedNames.Contains(s.Name.ToLower()))
                            .ToListAsync();

                        var existingDbSpecialtyIds = existingDbSpecialties.Select(s => s.SpecialtyId).ToList();
                        var currentSpecialtyIds = doctor.DoctorSpecialties.Select(ds => ds.SpecialtyId).ToList();

                        var toRemove = doctor.DoctorSpecialties.Where(ds => !existingDbSpecialtyIds.Contains(ds.SpecialtyId)).ToList();
                        var toAddIds = existingDbSpecialtyIds.Except(currentSpecialtyIds).ToList();

                        foreach (var ds in toRemove)
                        {
                            doctor.DoctorSpecialties.Remove(ds);
                        }

                        foreach (var id in toAddIds)
                        {
                            doctor.DoctorSpecialties.Add(new DoctorSpecialty
                            {
                                DoctorId = doctor.DoctorId,
                                SpecialtyId = id,
                                ClinicPrice = 500 // Default price as before
                            });
                        }
                    }
                    else
                    {
                        doctor.DoctorSpecialties.Clear();
                    }
                }

                await dbContext.SaveChangesAsync();
                
                // Fetch again to get the full mapped properties
                return ServiceResult<DoctorProfileDTO>.Success((await GetProfile(userId))!);
            }
            catch (Exception ex)
            {
                return ServiceResult<DoctorProfileDTO>.Failure($"Failed to update profile: {ex.Message}");
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
                VerificationStatus = doctor.VerificationStatus.ToString(),
                AdminComment = doctor.AdminComment,
                PendingChatRequestsCount = pendingChatRequests.Count,
                TodaysAppointmentsCount = todaysAppointments.Count,
                TotalPatientsSeen = totalPatientsSeen,
                PendingChatRequests = pendingChatRequests,
                TodaysAppointments = todaysAppointments
            };
        }


    }
}
