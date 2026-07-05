using Tabibi.Domain.Entities;

namespace Tabibi.Domain.Repositories
{
    public interface IDoctorProfileRepository
    {
        Task<DoctorProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default);
        Task<bool> ExistsForUserAsync(string userId, CancellationToken ct = default);
        void Add(DoctorProfile profile);
    }
}
