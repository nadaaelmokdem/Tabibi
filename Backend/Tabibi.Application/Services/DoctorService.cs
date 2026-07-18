using Tabibi.Application.Extensions;
using Tabibi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Tabibi.Application.Shared;
using System.Text.Json;
using Tabibi.Core.Models;
using Tabibi.Application.DTOs;

namespace Tabibi.Application.Services
{
    public class DoctorService(IUnitOfWork unitOfWork, IFileService fileService) : Tabibi.Application.Interfaces.IDoctorService
    {


        public async Task<DoctorProfileDTO?> GetProfile(string userId)
        {
            var doctor = await unitOfWork.DoctorProfiles.Query()
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null) return null;

            return doctor.ToDTO();
        }

        public async Task<ServiceResult> UpdateProfileField(string userId, string fieldName, string value)
        {
            var doctor = await unitOfWork.DoctorProfiles.Query()
                .Include(d => d.DoctorSpecialties)
                .Include(d => d.OldSpecialties)
                .FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null)
            {
                return ServiceResult.Failure("Doctor profile not found!");
            }

            try
            {
                bool sensitiveDataChanged = false;
                switch (fieldName.ToLower())
                {
                    case "licensenumber":
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            return ServiceResult.Failure("License number is required.");
                        }
                        if (!System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), @"^\d+$"))
                        {
                            return ServiceResult.Failure("License number must contain digits only.");
                        }
                        if (doctor.LicenseNumber != value)
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            await LogSensitiveChange(doctor.DoctorId, userId, "LicenseNumber", doctor.LicenseNumber, value);
                            doctor.LicenseNumber = value;
                            sensitiveDataChanged = true;
                        }
                        break;
                    case "nationalidnumber":
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            return ServiceResult.Failure("National ID is required.");
                        }
                        if (!System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), @"^(2|3)\d{13}$"))
                        {
                            return ServiceResult.Failure("Must be a valid 14-digit Egyptian National ID.");
                        }
                        if (doctor.NationalIdNumber != value)
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            await LogSensitiveChange(doctor.DoctorId, userId, "NationalIdNumber", doctor.NationalIdNumber, value);
                            doctor.NationalIdNumber = value;
                            sensitiveDataChanged = true;
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
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            if (doctor.LicenseExpiryDate != null)
                            {
                                BackupApprovedDataIfNeeded(doctor);
                                await LogSensitiveChange(doctor.DoctorId, userId, "LicenseExpiryDate", doctor.LicenseExpiryDate?.ToString("yyyy-MM-dd"), null);
                                sensitiveDataChanged = true;
                            }
                            doctor.LicenseExpiryDate = null;
                        }
                        else if (DateTime.TryParse(value, out DateTime expiry))
                        {
                            if (doctor.LicenseExpiryDate != expiry)
                            {
                                BackupApprovedDataIfNeeded(doctor);
                                await LogSensitiveChange(doctor.DoctorId, userId, "LicenseExpiryDate", doctor.LicenseExpiryDate?.ToString("yyyy-MM-dd"), expiry.ToString("yyyy-MM-dd"));
                                sensitiveDataChanged = true;
                            }
                            doctor.LicenseExpiryDate = expiry;
                        }
                        break;
                    case "specialties":
                        
                        var names = value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                        
                        if (names.Distinct(StringComparer.OrdinalIgnoreCase).Count() != names.Count)
                        {
                            return ServiceResult.Failure("Duplicate specialties are not allowed.");
                        }
                        
                        if (names.Count > 3)
                        {
                            return ServiceResult.Failure("A doctor can have a maximum of 3 specialties.");
                        }

                        var oldSpecialties = FormatSpecialties(doctor.DoctorSpecialties);

                        var allSpecialties = await unitOfWork.Specialties.Query().Where(s => names.Contains(s.Name)).ToListAsync();
                        var newSpecialtyIds = allSpecialties.Select(s => s.Id).ToList();

                        var currentSpecialties = doctor.DoctorSpecialties.ToList();
                        var currentSpecialtyIds = currentSpecialties.Select(ds => ds.Id).ToList();

                        var toRemove = currentSpecialties.Where(ds => !newSpecialtyIds.Contains(ds.Id)).ToList();
                        var toAddIds = newSpecialtyIds.Where(id => !currentSpecialtyIds.Contains(id)).ToList();
                        
                        if (toRemove.Any() || toAddIds.Any())
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            var newSpecialties = string.Join(", ", allSpecialties
                                .Where(s => newSpecialtyIds.Contains(s.Id))
                                .Select(s => s.Name)
                                .OrderBy(n => n));
                            await LogSensitiveChange(doctor.DoctorId, userId, "Specialties", oldSpecialties, newSpecialties);
                            sensitiveDataChanged = true;
                        }

                        unitOfWork.DoctorSpecialties.RemoveRange(toRemove);

                        foreach (var id in toAddIds)
                        {
                            doctor.DoctorSpecialties.Add(new DoctorSpecialty { DoctorId = doctor.DoctorId, SpecialtyId = id });
                        }
                        break;
                    case "licenseproofurl":
                        if (!IsValidProofLink(value)) return ServiceResult.Failure("Please enter a valid link for the license proof.");
                        if (doctor.LicenseProofUrl != value)
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            await LogSensitiveChange(doctor.DoctorId, userId, "LicenseProofUrl", doctor.LicenseProofUrl, value);
                            doctor.LicenseProofUrl = value;
                            sensitiveDataChanged = true;
                        }
                        break;
                    case "idproofurl":
                        if (!IsValidProofLink(value)) return ServiceResult.Failure("Please enter a valid link for the ID proof.");
                        if (doctor.IdProofUrl != value)
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            await LogSensitiveChange(doctor.DoctorId, userId, "IdProofUrl", doctor.IdProofUrl, value);
                            doctor.IdProofUrl = value;
                            sensitiveDataChanged = true;
                        }
                        break;
                    case "degreeproofurl":
                        if (!IsValidProofLink(value)) return ServiceResult.Failure("Please enter a valid link for the degree proof.");
                        if (doctor.DegreeProofUrl != value)
                        {
                            BackupApprovedDataIfNeeded(doctor);
                            await LogSensitiveChange(doctor.DoctorId, userId, "DegreeProofUrl", doctor.DegreeProofUrl, value);
                            doctor.DegreeProofUrl = value;
                            sensitiveDataChanged = true;
                        }
                        break;
                    case "profilepictureurl":
                        if (!string.IsNullOrEmpty(doctor.ProfilePictureUrl) && doctor.ProfilePictureUrl != value)
                        {
                            await fileService.DeleteFileAsync(doctor.ProfilePictureUrl);
                        }
                        doctor.ProfilePictureUrl = value;
                        break;
                    case "clinicprice":
                        if (decimal.TryParse(value, out decimal clinicPrice))
                        {
                            if (doctor.IsClinicEnabled && clinicPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            if (doctor.IsChatEnabled && doctor.ChatPrice > clinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({clinicPrice} EGP).");
                            }
                            if (doctor.IsVideoCallEnabled && doctor.VideoCallPrice > clinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({clinicPrice} EGP).");
                            }
                            doctor.ClinicPrice = clinicPrice;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid price value.");
                        }
                        break;
                    case "chatprice":
                        if (decimal.TryParse(value, out decimal chatPrice))
                        {
                            if (doctor.IsChatEnabled && chatPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            if (doctor.IsChatEnabled && chatPrice > doctor.ClinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({doctor.ClinicPrice} EGP).");
                            }
                            doctor.ChatPrice = chatPrice;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid price value.");
                        }
                        break;
                    case "videocallprice":
                        if (decimal.TryParse(value, out decimal videoCallPrice))
                        {
                            if (doctor.IsVideoCallEnabled && videoCallPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            if (doctor.IsVideoCallEnabled && videoCallPrice > doctor.ClinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({doctor.ClinicPrice} EGP).");
                            }
                            doctor.VideoCallPrice = videoCallPrice;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid price value.");
                        }
                        break;
                    case "isclinicenabled":
                        if (bool.TryParse(value, out bool isClinicEnabled))
                        {
                            if (isClinicEnabled && doctor.ClinicPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            doctor.IsClinicEnabled = isClinicEnabled;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid boolean value.");
                        }
                        break;
                    case "ischatenabled":
                        if (bool.TryParse(value, out bool isChatEnabled))
                        {
                            if (isChatEnabled && doctor.ChatPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            if (isChatEnabled && doctor.ChatPrice > doctor.ClinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({doctor.ClinicPrice} EGP).");
                            }
                            doctor.IsChatEnabled = isChatEnabled;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid boolean value.");
                        }
                        break;
                    case "isvideocallenabled":
                        if (bool.TryParse(value, out bool isVideoCallEnabled))
                        {
                            if (isVideoCallEnabled && doctor.VideoCallPrice <= 0)
                            {
                                return ServiceResult.Failure("Prices must be greater than 0.");
                            }
                            if (isVideoCallEnabled && doctor.VideoCallPrice > doctor.ClinicPrice)
                            {
                                return ServiceResult.Failure($"Remote consultation prices cannot exceed clinic price ({doctor.ClinicPrice} EGP).");
                            }
                            doctor.IsVideoCallEnabled = isVideoCallEnabled;
                        }
                        else
                        {
                            return ServiceResult.Failure("Invalid boolean value.");
                        }
                        break;
                    default:
                        return ServiceResult.Failure("Field doesn't exist or cannot be updated via this endpoint!");
                }

                if (sensitiveDataChanged)
                {
                    doctor.VerificationStatus = DoctorVerificationStatus.Pending;
                    doctor.AdminComment = "Doctor updated their sensitive data. Please review the new changes.";
                    doctor.ReviewedAt = null;
                }

                await unitOfWork.CompleteAsync();
                return ServiceResult.Success();
            }
            catch (Exception ex)
            {
                return ServiceResult.Failure(ex.Message);
            }
        }

        public async Task<ServiceResult<DoctorProfileDTO>> BulkUpdateProfile(string userId, DoctorProfileBulkUpdateDTO profileData)
        {
            var doctor = await unitOfWork.DoctorProfiles.Query()
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null)
            {
                return ServiceResult<DoctorProfileDTO>.Failure("Doctor profile not found!");
            }

            if ((profileData.IsClinicEnabled && profileData.ClinicPrice <= 0) ||
                (profileData.IsChatEnabled && profileData.ChatPrice <= 0) ||
                (profileData.IsVideoCallEnabled && profileData.VideoCallPrice <= 0))
            {
                return ServiceResult<DoctorProfileDTO>.Failure("Prices must be greater than 0.");
            }

            if (profileData.IsChatEnabled && profileData.ChatPrice > profileData.ClinicPrice)
            {
                return ServiceResult<DoctorProfileDTO>.Failure($"Remote consultation prices cannot exceed clinic price ({profileData.ClinicPrice} EGP).");
            }

            if (profileData.IsVideoCallEnabled && profileData.VideoCallPrice > profileData.ClinicPrice)
            {
                return ServiceResult<DoctorProfileDTO>.Failure($"Remote consultation prices cannot exceed clinic price ({profileData.ClinicPrice} EGP).");
            }

            try
            {
                var oldLicenseNumber = doctor.LicenseNumber;
                var oldNationalId = doctor.NationalIdNumber;
                var oldLicenseExpiry = doctor.LicenseExpiryDate;
                var oldLicenseProof = doctor.LicenseProofUrl;
                var oldIdProof = doctor.IdProofUrl;
                var oldDegreeProof = doctor.DegreeProofUrl;
                var oldSpecialties = FormatSpecialties(doctor.DoctorSpecialties);

                doctor.ClinicLocation = profileData.ClinicLocation;
                doctor.ClinicPhoneNumber = profileData.ClinicPhoneNumber;
                
                if (!string.IsNullOrEmpty(doctor.ProfilePictureUrl) && doctor.ProfilePictureUrl != profileData.ProfilePictureUrl)
                {
                    await fileService.DeleteFileAsync(doctor.ProfilePictureUrl);
                }
                doctor.ProfilePictureUrl = profileData.ProfilePictureUrl;
                doctor.Bio = profileData.Bio;
                doctor.YearsOfExperience = profileData.YearsOfExperience;

                if (string.IsNullOrWhiteSpace(profileData.LicenseNumber))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("License number is required.");
                     }
                     if (!System.Text.RegularExpressions.Regex.IsMatch(profileData.LicenseNumber.Trim(), @"^\d+$"))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("License number must contain digits only.");
                     }

                     if (string.IsNullOrWhiteSpace(profileData.NationalIdNumber))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("National ID is required.");
                     }
                     if (!System.Text.RegularExpressions.Regex.IsMatch(profileData.NationalIdNumber.Trim(), @"^(2|3)\d{13}$"))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("Must be a valid 14-digit Egyptian National ID.");
                     }

                     if (!string.IsNullOrWhiteSpace(profileData.LicenseProofUrl) && !IsValidProofLink(profileData.LicenseProofUrl))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("Please enter a valid link for the license proof.");
                     }
                     if (!string.IsNullOrWhiteSpace(profileData.IdProofUrl) && !IsValidProofLink(profileData.IdProofUrl))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("Please enter a valid link for the ID proof.");
                     }
                     if (!string.IsNullOrWhiteSpace(profileData.DegreeProofUrl) && !IsValidProofLink(profileData.DegreeProofUrl))
                     {
                         return ServiceResult<DoctorProfileDTO>.Failure("Please enter a valid link for the degree proof.");
                     }

                     doctor.LicenseNumber = profileData.LicenseNumber;
                     doctor.NationalIdNumber = profileData.NationalIdNumber;
                     doctor.LicenseProofUrl = profileData.LicenseProofUrl;
                     doctor.IdProofUrl = profileData.IdProofUrl;
                     doctor.DegreeProofUrl = profileData.DegreeProofUrl;
                     doctor.LicenseExpiryDate = profileData.LicenseExpiryDate;
                     doctor.LicenseExpiryDate = profileData.LicenseExpiryDate;

                     if (profileData.Specialties != null && profileData.Specialties.Any())
                    {
                        var requestedNames = profileData.Specialties
                            .Where(s => !string.IsNullOrWhiteSpace(s))
                            .Select(s => s.Trim())
                            .ToList();
                            
                        if (requestedNames.Distinct(StringComparer.OrdinalIgnoreCase).Count() != requestedNames.Count)
                        {
                            return ServiceResult<DoctorProfileDTO>.Failure("Duplicate specialties are not allowed.");
                        }

                        if (requestedNames.Count > 3)
                        {
                            return ServiceResult<DoctorProfileDTO>.Failure("A doctor can have a maximum of 3 specialties.");
                        }

                        var lowerRequestedNames = requestedNames.Select(s => s.ToLower()).ToList();
                        
                        var existingDbSpecialties = await unitOfWork.Specialties.Query()
                            .Where(s => lowerRequestedNames.Contains(s.Name.ToLower()))
                            .ToListAsync();

                        var existingDbSpecialtyIds = existingDbSpecialties.Select(s => s.Id).ToList();
                        var currentSpecialtyIds = doctor.DoctorSpecialties.Select(ds => ds.Id).ToList();

                        var toRemove = doctor.DoctorSpecialties.Where(ds => !existingDbSpecialtyIds.Contains(ds.Id)).ToList();
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
                                SpecialtyId = id
                            });
                        }
                    }
                    else
                     {
                         doctor.DoctorSpecialties.Clear();
                     }

                 BackupApprovedDataIfNeeded(doctor);
                
                doctor.ClinicPrice = profileData.ClinicPrice;
                doctor.IsClinicEnabled = profileData.IsClinicEnabled;
                doctor.ChatPrice = profileData.ChatPrice;
                doctor.IsChatEnabled = profileData.IsChatEnabled;
                doctor.VideoCallPrice = profileData.VideoCallPrice;
                doctor.IsVideoCallEnabled = profileData.IsVideoCallEnabled;

                 bool sensitiveChanged = false;

                 sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "LicenseNumber", oldLicenseNumber, doctor.LicenseNumber);
                    sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "NationalIdNumber", oldNationalId, doctor.NationalIdNumber);
                    sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "LicenseExpiryDate", oldLicenseExpiry?.ToString("yyyy-MM-dd"), doctor.LicenseExpiryDate?.ToString("yyyy-MM-dd"));
                    sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "LicenseProofUrl", oldLicenseProof, doctor.LicenseProofUrl);
                    sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "IdProofUrl", oldIdProof, doctor.IdProofUrl);
                    sensitiveChanged |= await LogIfChanged(doctor.DoctorId, userId, "DegreeProofUrl", oldDegreeProof, doctor.DegreeProofUrl);

                    var newSpecialties = FormatSpecialties(doctor.DoctorSpecialties);
                    if (!string.Equals(oldSpecialties, newSpecialties, StringComparison.Ordinal))
                    {
                         await LogSensitiveChange(doctor.DoctorId, userId, "Specialties", oldSpecialties, newSpecialties);
                         sensitiveChanged = true;
                     }

                if (sensitiveChanged)
                {
                    doctor.VerificationStatus = DoctorVerificationStatus.Pending;
                    doctor.AdminComment = "Profile submitted or updated — pending admin review.";
                    doctor.ReviewedAt = null;
                }

                await unitOfWork.CompleteAsync();
                
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
            var doctor = await unitOfWork.DoctorProfiles.Query()
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.UserId == userId);

            if (doctor == null) return null;

            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var todayEnd = todayStart.AddDays(1);

            var toComplete = await unitOfWork.Appointments.Query()
                .Where(a => a.DoctorId == doctor.DoctorId 
                         && a.Status == AppointmentStatus.Confirmed 
                         && a.ScheduledAt >= todayStart 
                         && a.ScheduledAt < todayEnd)
                .ToListAsync();

            bool changed = false;
            foreach (var a in toComplete)
            {
                if (a.ConsultationType == ConsultationType.Clinic && now >= a.ScheduledAt.AddMinutes(a.DurationMins))
                {
                    a.Status = AppointmentStatus.Completed;
                    changed = true;
                }
                else if (a.ConsultationType == ConsultationType.Chat && now >= a.ScheduledAt.AddDays(7))
                {
                    a.Status = AppointmentStatus.Completed;
                    changed = true;
                }
            }
            if (changed) await unitOfWork.CompleteAsync();

            var chatSessions = await unitOfWork.ChatSessions.Query()
                .Include(cs => cs.Patient).ThenInclude(p => p.User)
                .Where(cs => cs.DoctorId == doctor.DoctorId && cs.Status == SessionStatus.Active)
                .OrderBy(cs => cs.StartedAt)
                .Take(10)
                .Select(cs => new ChatSessionDTO
                {
                    SessionId = cs.SessionId,
                    PatientName = cs.Patient.User.FullName,
                    SessionSummary = cs.SessionSummary,
                    StartedAt = cs.StartedAt
                })
                .ToListAsync();


            var activeConsultations = await unitOfWork.Appointments.Query()
                .Include(a => a.Patient).ThenInclude(p => p.User)
                .Where(a => a.DoctorId == doctor.DoctorId 
                         && a.Status == AppointmentStatus.Confirmed
                         && (a.ConsultationType == ConsultationType.Chat 
                             || a.ConsultationType == ConsultationType.VideoCall 
                             || (a.ConsultationType == ConsultationType.Clinic && a.ScheduledAt >= DateTime.UtcNow)))
                .OrderBy(a => a.ScheduledAt)
                .Select(a => new UpcomingAppointmentDTO
                {
                    AppointmentId = a.AppointmentId,
                    DoctorName = doctor.User.FullName,
                    PatientName = a.Patient.User.FullName,
                    ScheduledAt = a.ScheduledAt,
                    DoctorProfilePictureUrl = a.Patient.ProfilePictureUrl,
                    ConsultationType = a.ConsultationType.ToString(),
                    Status = a.Status.ToString(),
                    PaymentMethod = a.PaymentMethod.ToString(),
                    SessionId = a.ConsultationType == ConsultationType.VideoCall ? a.VideoCallSessionId : a.SessionId
                })
                .ToListAsync();

            var totalPatientsSeen = await unitOfWork.Appointments.Query()
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
                ChatSessionsCount = chatSessions.Count,
                ActiveConsultationsCount = activeConsultations.Count,
                TotalPatientsSeen = totalPatientsSeen,
                ChatSessions = chatSessions,
                ActiveConsultations = activeConsultations
            };
        }


        public async Task<List<DoctorAvailabilityDTO>> GetAvailabilities(string userId)
        {
            var doctor = await unitOfWork.DoctorProfiles.Query().FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null) return new List<DoctorAvailabilityDTO>();

            var availabilities = await unitOfWork.DoctorAvailabilities.Query()
                .Where(a => a.DoctorId == doctor.DoctorId)
                .Select(a => new DoctorAvailabilityDTO
                {
                    AvailabilityId = a.Id,
                    DayOfWeek = a.DayOfWeek,
                    StartTime = a.StartTime.ToString(@"hh\:mm"),
                    EndTime = a.EndTime.ToString(@"hh\:mm"),
                    SlotDurationMins = a.SlotDurationMins,
                    IsActive = a.IsActive,
                    SpecificDate = a.SpecificDate
                }).ToListAsync();

            return availabilities;
        }

        private static bool IsNewCoveringExisting(TimeSpan newStart, TimeSpan newEnd, TimeSpan existingStart, TimeSpan existingEnd)
        {
            var existingIsOvernight = existingStart >= existingEnd;
            var newIsOvernight = newStart >= newEnd;

            if (!existingIsOvernight)
            {
                if (!newIsOvernight)
                {
                    return newStart <= existingStart && newEnd >= existingEnd;
                }
                else
                {
                    return existingStart >= newStart || existingEnd <= newEnd;
                }
            }
            else
            {
                if (!newIsOvernight)
                {
                    return false;
                }
                else
                {
                    return newStart <= existingStart && newEnd >= existingEnd;
                }
            }
        }

        public async Task<ServiceResult> UpdateAvailabilities(string userId, UpdateAvailabilityRequestDTO request)
        {
            var doctor = await unitOfWork.DoctorProfiles.Query().FirstOrDefaultAsync(d => d.UserId == userId);
            if (doctor == null) return ServiceResult.Failure("Doctor not found");

            var currentAvailabilities = await unitOfWork.DoctorAvailabilities.Query()
                .Where(a => a.DoctorId == doctor.DoctorId)
                .ToListAsync();

            var blockingStatuses = new[] { AppointmentStatus.Confirmed, AppointmentStatus.Pending };
            var activeAppointments = await unitOfWork.Appointments.Query()
                .Where(a => a.DoctorId == doctor.DoctorId && a.ScheduledAt > DateTime.UtcNow && blockingStatuses.Contains(a.Status))
                .ToListAsync();

            // Ensure no existing appointments conflict with removed or modified availabilities
            foreach (var existing in currentAvailabilities)
            {
                // Check if this existing availability is still covered by the new request
                var matchingNew = existing.SpecificDate.HasValue
                    // For specific-date slots: match on exact date + time coverage
                    ? request.Availabilities.FirstOrDefault(a =>
                        a.SpecificDate.HasValue &&
                        a.SpecificDate.Value.Date == existing.SpecificDate.Value.Date &&
                        IsNewCoveringExisting(TimeSpan.Parse(a.StartTime), TimeSpan.Parse(a.EndTime), existing.StartTime, existing.EndTime) &&
                        a.IsActive)
                    // For weekly slots: match on DayOfWeek + time coverage
                    : request.Availabilities.FirstOrDefault(a =>
                        !a.SpecificDate.HasValue &&
                        a.DayOfWeek == existing.DayOfWeek &&
                        IsNewCoveringExisting(TimeSpan.Parse(a.StartTime), TimeSpan.Parse(a.EndTime), existing.StartTime, existing.EndTime) &&
                        a.IsActive);

                if (matchingNew == null)
                {
                    bool hasConflict;
                    if (existing.SpecificDate.HasValue)
                    {
                        var specificDay = existing.SpecificDate.Value.Date;
                        if (existing.StartTime < existing.EndTime)
                        {
                            hasConflict = activeAppointments.Any(app =>
                                app.ScheduledAt.Date == specificDay &&
                                app.ScheduledAt.TimeOfDay >= existing.StartTime &&
                                app.ScheduledAt.TimeOfDay < existing.EndTime);
                        }
                        else
                        {
                            hasConflict = activeAppointments.Any(app =>
                                (app.ScheduledAt.Date == specificDay && app.ScheduledAt.TimeOfDay >= existing.StartTime) ||
                                (app.ScheduledAt.Date == specificDay.AddDays(1) && app.ScheduledAt.TimeOfDay < existing.EndTime));
                        }
                    }
                    else
                    {
                        if (existing.StartTime < existing.EndTime)
                        {
                            hasConflict = activeAppointments.Any(app =>
                                app.ScheduledAt.DayOfWeek == existing.DayOfWeek &&
                                app.ScheduledAt.TimeOfDay >= existing.StartTime &&
                                app.ScheduledAt.TimeOfDay < existing.EndTime);
                        }
                        else
                        {
                            var nextDay = (DayOfWeek)(((int)existing.DayOfWeek + 1) % 7);
                            hasConflict = activeAppointments.Any(app =>
                                (app.ScheduledAt.DayOfWeek == existing.DayOfWeek && app.ScheduledAt.TimeOfDay >= existing.StartTime) ||
                                (app.ScheduledAt.DayOfWeek == nextDay && app.ScheduledAt.TimeOfDay < existing.EndTime));
                        }
                    }

                    if (hasConflict)
                    {
                        var dateStr = existing.SpecificDate.HasValue
                            ? existing.SpecificDate.Value.ToString("MMMM d, yyyy")
                            : existing.DayOfWeek.ToString();
                        return ServiceResult.Failure($"Cannot remove availability on {dateStr} from {existing.StartTime} to {existing.EndTime} because there are active appointments booked during this time.");
                    }
                }
            }

            unitOfWork.DoctorAvailabilities.RemoveRange(currentAvailabilities);

            foreach (var a in request.Availabilities)
            {
                await unitOfWork.DoctorAvailabilities.AddAsync(new DoctorAvailability
                {
                    DoctorId = doctor.DoctorId,
                    DayOfWeek = a.SpecificDate.HasValue
                        ? a.SpecificDate.Value.DayOfWeek
                        : a.DayOfWeek,
                    StartTime = TimeSpan.Parse(a.StartTime),
                    EndTime = TimeSpan.Parse(a.EndTime),
                    SlotDurationMins = a.SlotDurationMins > 0 ? a.SlotDurationMins : 30,
                    IsActive = a.IsActive,
                    SpecificDate = a.SpecificDate.HasValue
                        ? DateTime.SpecifyKind(a.SpecificDate.Value.Date, DateTimeKind.Utc)
                        : null
                });
            }

            await unitOfWork.CompleteAsync();
            return ServiceResult.Success();
        }

        private static bool IsValidProofLink(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            
            value = value.Trim();

            // Allow local relative paths starting with / (e.g. uploaded files stored in /proofs/)
            if (value.StartsWith("/")) return true;

            // Check if it is a valid absolute HTTP/HTTPS URL
            return Uri.TryCreate(value, UriKind.Absolute, out var uriResult) 
                   && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }

        private static string FormatSpecialties(IEnumerable<DoctorSpecialty> specialties)
        {
            return string.Join(", ", specialties
                .Select(ds => ds.Specialty?.Name ?? "")
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .OrderBy(n => n));
        }

        private async Task LogSensitiveChange(long doctorId, string changedByUserId, string fieldName, string? oldValue, string? newValue)
        {
            if (string.Equals(oldValue ?? "", newValue ?? "", StringComparison.Ordinal)) return;

            await unitOfWork.DoctorProfileChangeLogs.AddAsync(new DoctorProfileChangeLog
            {
                DoctorId = doctorId,
                FieldName = fieldName,
                OldValue = oldValue,
                NewValue = newValue,
                ChangedAt = DateTime.UtcNow,
                ChangedByUserId = changedByUserId
            });
        }

        private async Task<bool> LogIfChanged(long doctorId, string changedByUserId, string fieldName, string? oldValue, string? newValue)
        {
            if (string.Equals(oldValue ?? "", newValue ?? "", StringComparison.Ordinal)) return false;
            await LogSensitiveChange(doctorId, changedByUserId, fieldName, oldValue, newValue);
            return true;
        }

        private void BackupApprovedDataIfNeeded(DoctorProfile doctor)
        {
            if (doctor.VerificationStatus == DoctorVerificationStatus.Approved)
            {
                doctor.OldLicenseNumber = doctor.LicenseNumber;
                doctor.OldNationalIdNumber = doctor.NationalIdNumber;
                doctor.OldLicenseExpiryDate = doctor.LicenseExpiryDate;
                doctor.OldLicenseProofUrl = doctor.LicenseProofUrl;
                doctor.OldIdProofUrl = doctor.IdProofUrl;
                doctor.OldDegreeProofUrl = doctor.DegreeProofUrl;

                unitOfWork.DoctorOldSpecialties.RemoveRange(doctor.OldSpecialties);
                doctor.OldSpecialties.Clear();

                foreach (var ds in doctor.DoctorSpecialties)
                {
                    doctor.OldSpecialties.Add(new DoctorOldSpecialty
                    {
                        DoctorId = doctor.DoctorId,
                        SpecialtyId = ds.Id
                    });
                }
            }
        }
    }









}
