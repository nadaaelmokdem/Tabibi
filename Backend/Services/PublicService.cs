using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;
using System.Linq;

namespace Tabibi.Services
{
    public class PublicService(AppDbContext dbContext)
    {
        public async Task<List<SpecialtyDTO>> GetSpecialtiesAsync()
        {
            return await dbContext.Specialties
                .OrderBy(s => s.Name)
                .Select(s => new SpecialtyDTO
                {
                    SpecialtyId = s.SpecialtyId,
                    Name = s.Name
                })
                .ToListAsync();
        }

        public async Task<PaginatedResultDTO<DoctorListDTO>> GetDoctorsAsync(DoctorSearchFilterDTO filter)
        {
            var query = dbContext.DoctorProfiles
                .Include(d => d.User)
                .Include(d => d.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .AsQueryable();

            query = query.Where(d => d.VerificationStatus == DoctorVerificationStatus.Approved);

            query = query.Where(d => d.DoctorSpecialties.Count != 0);

            if (filter.SpecialtyId.HasValue)
            {
                query = query.Where(d => d.DoctorSpecialties.Any(ds => ds.SpecialtyId == filter.SpecialtyId.Value));
            }

            // Price & Booking type filtering
            if (filter.MinPrice.HasValue || filter.MaxPrice.HasValue || (filter.BookingTypes != null && filter.BookingTypes.Any()))
            {
                var types = filter.BookingTypes ?? new List<ConsultationType> { ConsultationType.Clinic, ConsultationType.Chat, ConsultationType.VideoCall };
                var min = filter.MinPrice ?? 0;
                var max = filter.MaxPrice ?? decimal.MaxValue;

                query = query.Where(d => 
                    (types.Contains(ConsultationType.Clinic) && d.IsClinicEnabled && d.ClinicPrice >= min && d.ClinicPrice <= max) ||
                    (types.Contains(ConsultationType.Chat) && d.IsChatEnabled && d.ChatPrice >= min && d.ChatPrice <= max) ||
                    (types.Contains(ConsultationType.VideoCall) && d.IsVideoCallEnabled && d.VideoCallPrice >= min && d.VideoCallPrice <= max)
                );
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(d => d.AverageRating)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(d => new DoctorListDTO
                {
                    DoctorId = d.DoctorId,
                    UserId = d.UserId,
                    FullName = d.User.FullName,
                    ProfilePictureUrl = d.ProfilePictureUrl,
                    AverageRating = d.AverageRating,
                    YearsOfExperience = d.YearsOfExperience,
                    ClinicLocation = d.ClinicLocation,
                    Bio = d.Bio,
                    ClinicPrice = d.ClinicPrice,
                    IsClinicEnabled = d.IsClinicEnabled,
                    ChatPrice = d.ChatPrice,
                    IsChatEnabled = d.IsChatEnabled,
                    VideoCallPrice = d.VideoCallPrice,
                    IsVideoCallEnabled = d.IsVideoCallEnabled,
                    Specialties = d.DoctorSpecialties.Select(ds => new SpecialtyDTO
                    {
                        SpecialtyId = ds.SpecialtyId,
                        Name = ds.Specialty.Name
                    }).ToList()
                })
                .ToListAsync();

            return new PaginatedResultDTO<DoctorListDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }
        public async Task<DoctorListDTO?> GetDoctorByIdAsync(int doctorId)
        {
            var d = await dbContext.DoctorProfiles
                .Include(dp => dp.User)
                .Include(dp => dp.DoctorSpecialties)
                .ThenInclude(ds => ds.Specialty)
                .FirstOrDefaultAsync(dp => dp.DoctorId == doctorId);

            if (d == null || d.VerificationStatus != DoctorVerificationStatus.Approved) return null;

            return new DoctorListDTO
            {
                DoctorId = d.DoctorId,
                UserId = d.UserId,
                FullName = d.User.FullName,
                ProfilePictureUrl = d.ProfilePictureUrl,
                AverageRating = d.AverageRating,
                YearsOfExperience = d.YearsOfExperience,
                ClinicLocation = d.ClinicLocation,
                Bio = d.Bio,
                ClinicPrice = d.ClinicPrice,
                IsClinicEnabled = d.IsClinicEnabled,
                ChatPrice = d.ChatPrice,
                IsChatEnabled = d.IsChatEnabled,
                VideoCallPrice = d.VideoCallPrice,
                IsVideoCallEnabled = d.IsVideoCallEnabled,
                Specialties = d.DoctorSpecialties.Select(ds => new SpecialtyDTO
                {
                    SpecialtyId = ds.SpecialtyId,
                    Name = ds.Specialty.Name
                }).ToList()
            };
        }
    }
}
