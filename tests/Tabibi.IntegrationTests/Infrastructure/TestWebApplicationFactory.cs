using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Linq;
using Tabibi.Infrastructure.Persistence;

namespace Tabibi.IntegrationTests.Infrastructure
{
    public class TestWebApplicationFactory : WebApplicationFactory<Program>
    {
        // Kept open for the lifetime of the factory: an in-memory SQLite database is
        // destroyed the moment its one and only connection closes.
        private readonly SqliteConnection _connection = new("DataSource=:memory:");

        public TestWebApplicationFactory()
        {
            _connection.Open();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["JwtSettings:Secret"] = "integration-test-super-secret-key-value-1234567890",
                    ["JwtSettings:ValidIssuer"] = "Tabibi.Tests",
                    ["JwtSettings:ValidAudience"] = "Tabibi.Tests.Client",
                    ["JwtSettings:DurationInMinutes"] = "60"
                });
            });

            builder.ConfigureServices(services =>
            {
                var dbContextOptionsDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (dbContextOptionsDescriptor is not null)
                    services.Remove(dbContextOptionsDescriptor);

                services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

                using var scope = services.BuildServiceProvider().CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.EnsureCreated();
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
                _connection.Dispose();
        }
    }
}
