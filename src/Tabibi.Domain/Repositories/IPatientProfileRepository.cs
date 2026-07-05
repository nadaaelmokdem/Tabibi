using Tabibi.Domain.Entities;

namespace Tabibi.Domain.Repositories
{
    /// <summary>
    /// Port defined by the Domain layer. Infrastructure provides the EF Core
    /// implementation; Application depends only on this interface.
    /// </summary>
    public interface IPatientProfileRepository
    {
        Task<PatientProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default);
        Task<bool> ExistsForUserAsync(string userId, CancellationToken ct = default);
        void Add(PatientProfile profile);
    }
}
