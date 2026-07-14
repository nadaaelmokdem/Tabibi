using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Extensions
{
    public static class DoctorExtensions
    {
        public static SpecialtyDTO ToDTO(this DoctorSpecialty specialty)
        {
            return new SpecialtyDTO
            {
                SpecialtyId = specialty.SpecialtyId,
                Name = specialty.Specialty?.Name ?? ""
            };
        }

        public static DoctorProfileDTO ToDTO(this DoctorProfile doctor)
        {
            return new DoctorProfileDTO
            {
                FullName = doctor.User?.FullName ?? "",
                Email = doctor.User?.Email ?? "",
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
                ProfilePictureUrl = doctor.ProfilePictureUrl,
                AverageRating = doctor.AverageRating,
                IsVerified = doctor.IsVerified,
                VerificationStatus = doctor.VerificationStatus.ToString(),
                AdminComment = doctor.AdminComment,
                IsAvailableNow = doctor.IsAvailableNow,
                ClinicPrice = doctor.ClinicPrice,
                IsClinicEnabled = doctor.IsClinicEnabled,
                ChatPrice = doctor.ChatPrice,
                IsChatEnabled = doctor.IsChatEnabled,
                VideoCallPrice = doctor.VideoCallPrice,
                IsVideoCallEnabled = doctor.IsVideoCallEnabled,
                Specialties = doctor.DoctorSpecialties
                    .Select(s => s.ToDTO())
                    .ToList()
            };
        }
    }
}
