using Microsoft.Extensions.Hosting;
using Tabibi.Application.Auth.Contracts;

namespace Tabibi.Infrastructure.Auth
{
    public class RefreshTokenCleanupService(IRefreshTokenStore tokenStore) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await tokenStore.CleanupExpiredTokensAsync();
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}
