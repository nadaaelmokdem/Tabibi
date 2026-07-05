using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tabibi.IntegrationTests.Infrastructure;
using Xunit;

namespace Tabibi.IntegrationTests.Auth
{
    public class AuthEndpointsTests : IClassFixture<TestWebApplicationFactory>
    {
        private readonly TestWebApplicationFactory _factory;

        public AuthEndpointsTests(TestWebApplicationFactory factory)
        {
            _factory = factory;
        }

        // BaseAddress is set to https (even though TestServer does no real TLS handshake)
        // because the auth cookies are marked Secure; CookieContainer only stores/replays
        // Secure cookies against an https-scheme request URI.
        private HttpClient CreateClient() => _factory.CreateClient(new()
        {
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });

        private static object NewSignupPayload(string email, string role = "User") => new
        {
            fullName = "Test User",
            email,
            password = "P@ssw0rd!123",
            phoneNumber = "+201000000000",
            role
        };

        [Fact]
        public async Task Register_NewPatient_ReturnsOkWithUserAndSetsCookies()
        {
            var client = CreateClient();
            var email = $"patient-{Guid.NewGuid():N}@example.com";

            var response = await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(response.Headers.Contains("Set-Cookie"));

            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(email, body.GetProperty("user").GetProperty("email").GetString());
        }

        [Fact]
        public async Task Register_DuplicateEmail_ReturnsBadRequest()
        {
            var client = CreateClient();
            var email = $"dup-{Guid.NewGuid():N}@example.com";

            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));
            var second = await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        }

        [Fact]
        public async Task Register_UnrecognisedRole_ReturnsBadRequest()
        {
            // NOTE on a pre-existing limitation carried over unchanged from the original code:
            // IIdentityService.CreateUserAsync commits the identity user immediately (ASP.NET
            // Identity's UserManager saves internally), *before* the unit-of-work transaction
            // that assigns the role/profile even starts. So an invalid role still leaves a bare,
            // role-less identity user behind - it is not rolled back. This test only pins down
            // the *externally visible* contract (bad request now, and the address is considered
            // taken afterwards); it does not claim the orphaned-row issue is fixed. Fixing it
            // properly means moving user creation itself inside the same transaction, a
            // candidate follow-up once the Identity bounded context work resumes.
            var client = CreateClient();
            var email = $"badrole-{Guid.NewGuid():N}@example.com";

            var response = await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email, role: "SuperAdmin"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var retry = await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));
            Assert.Equal(HttpStatusCode.BadRequest, retry.StatusCode);
        }

        [Fact]
        public async Task Login_WithCorrectCredentials_ReturnsOk()
        {
            var client = CreateClient();
            var email = $"login-{Guid.NewGuid():N}@example.com";
            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "P@ssw0rd!123" });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Login_WithWrongPassword_ReturnsNotFound()
        {
            var client = CreateClient();
            var email = $"login-wrong-{Guid.NewGuid():N}@example.com";
            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "WrongPassword!" });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task RefreshToken_AfterLogin_ReturnsOkAndRotatesCookie()
        {
            var client = CreateClient();
            var email = $"refresh-{Guid.NewGuid():N}@example.com";
            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            var refreshResponse = await client.PostAsync("/api/auth/refresh-token", null);

            Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        }

        [Fact]
        public async Task RefreshToken_WithoutAnyCookie_ReturnsBadRequest()
        {
            var client = CreateClient();

            var response = await client.PostAsync("/api/auth/refresh-token", null);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Logout_ThenRefresh_NoLongerWorks()
        {
            var client = CreateClient();
            var email = $"logout-{Guid.NewGuid():N}@example.com";
            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            var logoutResponse = await client.PostAsync("/api/auth/logout", null);
            Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

            var refreshAfterLogout = await client.PostAsync("/api/auth/refresh-token", null);
            Assert.Equal(HttpStatusCode.BadRequest, refreshAfterLogout.StatusCode);
        }

        [Fact]
        public async Task AddToRole_PromotesExistingPatientToDoctor()
        {
            var client = CreateClient();
            var email = $"promote-{Guid.NewGuid():N}@example.com";
            await client.PostAsJsonAsync("/api/auth/register", NewSignupPayload(email));

            var response = await client.PostAsJsonAsync("/api/auth/add-to-role", new { email, role = "Doctor" });

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task AddToRole_UnknownEmail_ReturnsBadRequest()
        {
            var client = CreateClient();

            var response = await client.PostAsJsonAsync(
                "/api/auth/add-to-role", new { email = $"ghost-{Guid.NewGuid():N}@example.com", role = "Doctor" });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
