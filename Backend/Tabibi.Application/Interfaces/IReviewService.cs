using Tabibi.Application.DTOs;

namespace Tabibi.Application.Interfaces;

public interface IReviewService
{
    Task<ServiceResult<PagedReviewsDTO>> GetDoctorReviewsAsync(long doctorId, int page = 1, int pageSize = 10);
    Task<ServiceResult> SubmitReviewAsync(string userId, CreateReviewDTO dto);
}
