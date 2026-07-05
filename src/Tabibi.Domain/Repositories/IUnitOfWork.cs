namespace Tabibi.Domain.Repositories
{
    /// <summary>
    /// Abstracts "save + transaction" so Application code never touches EF Core
    /// (or any other persistence technology) directly.
    /// </summary>
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken ct = default);

        /// <summary>
        /// Runs <paramref name="action"/> inside a database transaction, committing on
        /// success and rolling back if it throws. The action is responsible for calling
        /// SaveChangesAsync itself (possibly more than once) before returning.
        /// </summary>
        Task<TResult> ExecuteInTransactionAsync<TResult>(Func<CancellationToken, Task<TResult>> action, CancellationToken ct = default);
    }
}
