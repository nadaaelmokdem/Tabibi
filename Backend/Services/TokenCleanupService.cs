using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace Tabibi.Services
{
    public class TokenCleanupService : BackgroundService
    {
        private readonly ITokenStore _tokenStore;

        public TokenCleanupService(ITokenStore tokenStore)
        {
            _tokenStore = tokenStore;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await _tokenStore.CleanupExpiredTokensAsync();
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}
