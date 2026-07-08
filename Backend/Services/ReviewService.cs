using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;

namespace Tabibi.Services
{
    public class ReviewService(AppDbContext dbContext)
    {
        public async Task<ServiceResult<PagedReviewsDTO>> GetDoctorReviewsAsync(int doctorId, int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 50) pageSize = 50;

            var query = dbContext.DoctorReviews
                .Include(r => r.Appointment).ThenInclude(a => a.Patient).ThenInclude(p => p.User)
                .Where(r => r.Appointment.DoctorId == doctorId);

            var totalCount = await query.CountAsync();

            double averageRating = 0;
            if (totalCount > 0)
            {
                averageRating = await query.AverageAsync(r => r.Rating);
            }

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new DoctorReviewDTO
                {
                    ReviewId = r.ReviewId,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    PatientName = r.Appointment.Patient.User.FullName,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return ServiceResult<PagedReviewsDTO>.Success(new PagedReviewsDTO
            {
                Reviews = reviews,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                AverageRating = Math.Round(averageRating, 1)
            });
        }

        public async Task<ServiceResult> SubmitReviewAsync(string userId, CreateReviewDTO dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
            {
                return ServiceResult.Failure("Rating must be between 1 and 5.");
            }

            var patient = await dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult.Failure("Patient profile not found.");

            var appointment = await dbContext.Appointments
                .Include(a => a.Review)
                .FirstOrDefaultAsync(a => a.AppointmentId == dto.AppointmentId && a.PatientId == patient.PatientId);

            if (appointment == null) return ServiceResult.Failure("Appointment not found.");
            
            if (appointment.Status != AppointmentStatus.Completed)
            {
                return ServiceResult.Failure("You can only review completed appointments.");
            }

            if (appointment.Review != null)
            {
                return ServiceResult.Failure("You have already reviewed this appointment.");
            }

            bool hasChatted = await dbContext.ChatSessions.AnyAsync(cs => 
                cs.PatientId == patient.PatientId && 
                cs.DoctorId == appointment.DoctorId && 
                cs.Messages.Any(m => m.Role == UserRoles.Patient));

            if (!hasChatted)
            {
                return ServiceResult.Failure("You can only review doctors you have chatted with.");
            }

            var review = new DoctorReview
            {
                AppointmentId = appointment.AppointmentId,
                Rating = dto.Rating,
                Comment = dto.Comment
            };

            dbContext.DoctorReviews.Add(review);
            await dbContext.SaveChangesAsync();

            return ServiceResult.Success();
        }
    }
}
