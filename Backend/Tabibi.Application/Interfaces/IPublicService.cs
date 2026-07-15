using Tabibi.Application.DTOs;

namespace Tabibi.Application.Interfaces;

public interface IPublicService
{
    Task<List<SpecialtyDTO>> GetSpecialtiesAsync();
    Task<PaginatedResultDTO<DoctorListDTO>> GetDoctorsAsync(DoctorSearchFilterDTO filter);
    Task<DoctorListDTO?> GetDoctorByIdAsync(long doctorId);
}
