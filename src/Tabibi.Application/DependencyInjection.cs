using Microsoft.Extensions.DependencyInjection;
using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.Services;

namespace Tabibi.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ITokenRefreshService, TokenRefreshService>();

            return services;
        }
    }
}
