using Microsoft.EntityFrameworkCore;
using Tabibi.Domain.Entities;
using Tabibi.Domain.Repositories;

namespace Tabibi.Infrastructure.Persistence.Repositories
{
    public class DoctorProfileRepository(AppDbContext dbContext) : IDoctorProfileRepository
    {
        public Task<DoctorProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default) =>
            dbContext.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == userId, ct);

        public Task<bool> ExistsForUserAsync(string userId, CancellationToken ct = default) =>
            dbContext.DoctorProfiles.AnyAsync(d => d.UserId == userId, ct);

        public void Add(DoctorProfile profile) => dbContext.DoctorProfiles.Add(profile);
    }
}
