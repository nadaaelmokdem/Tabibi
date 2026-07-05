using Microsoft.EntityFrameworkCore.Storage;
using Tabibi.Domain.Repositories;

namespace Tabibi.Infrastructure.Persistence.Repositories
{
    public class UnitOfWork(AppDbContext dbContext) : IUnitOfWork
    {
        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            dbContext.SaveChangesAsync(ct);

        public async Task<TResult> ExecuteInTransactionAsync<TResult>(
            Func<CancellationToken, Task<TResult>> action, CancellationToken ct = default)
        {
            var strategy = dbContext.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using IDbContextTransaction transaction = await dbContext.Database.BeginTransactionAsync(ct);
                try
                {
                    var result = await action(ct);
                    await transaction.CommitAsync(ct);
                    return result;
                }
                catch
                {
                    await transaction.RollbackAsync(ct);
                    throw;
                }
            });
        }
    }
}
