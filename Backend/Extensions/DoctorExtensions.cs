using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Extensions
{
    public static class DoctorExtensions
    {
        public static SpecialtyPriceDTO ToDTO(this DoctorSpecialty specialty)
        {
            return new SpecialtyPriceDTO
            {
                SpecialtyName = specialty.Specialty?.Name ?? "",
                ClinicPrice = specialty.ClinicPrice,
                ChatPrice = specialty.ChatPrice,
                VideoPrice = specialty.VideoPrice,
                CallPrice = specialty.CallPrice,
                IsClinicEnabled = specialty.IsClinicEnabled,
                IsChatEnabled = specialty.IsChatEnabled,
                IsVideoEnabled = specialty.IsVideoEnabled,
                IsCallEnabled = specialty.IsCallEnabled
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
                Specialties = doctor.DoctorSpecialties
                    .Select(s => s.ToDTO())
                    .ToList()
            };
        }
    }
}
