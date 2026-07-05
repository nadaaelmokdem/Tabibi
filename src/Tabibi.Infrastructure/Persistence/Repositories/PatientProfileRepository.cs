using Microsoft.EntityFrameworkCore;
using Tabibi.Domain.Entities;
using Tabibi.Domain.Repositories;

namespace Tabibi.Infrastructure.Persistence.Repositories
{
    public class PatientProfileRepository(AppDbContext dbContext) : IPatientProfileRepository
    {
        public Task<PatientProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default) =>
            dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);

        public Task<bool> ExistsForUserAsync(string userId, CancellationToken ct = default) =>
            dbContext.PatientProfiles.AnyAsync(p => p.UserId == userId, ct);

        public void Add(PatientProfile profile) => dbContext.PatientProfiles.Add(profile);
    }
}
