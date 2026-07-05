using Moq;
using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.Services;
using Xunit;

namespace Tabibi.UnitTests.Auth
{
    public class TokenRefreshServiceTests
    {
        private readonly Mock<IRefreshTokenStore> _tokenStore = new();
        private readonly Mock<IIdentityService> _identityService = new();
        private readonly Mock<IJwtTokenGenerator> _tokenGenerator = new();
        private readonly TokenRefreshService _sut;

        public TokenRefreshServiceTests()
        {
            _sut = new TokenRefreshService(_tokenStore.Object, _identityService.Object, _tokenGenerator.Object);
        }

        private static IdentityUserInfo SampleUser(string id = "user-1") =>
            new(id, "jane@example.com", "Jane Doe", "+201000000000", true, DateTime.UtcNow);

        [Fact]
        public async Task RefreshToken_UnknownToken_ReturnsNull()
        {
            _tokenStore.Setup(s => s.GetActiveReplacementAsync("old")).ReturnsAsync((string?)null);
            _tokenStore.Setup(s => s.GetUserIdByTokenAsync("old")).ReturnsAsync((string?)null);

            var result = await _sut.RefreshTokenAsync("old");

            Assert.Null(result);
        }

        [Fact]
        public async Task RefreshToken_ValidToken_RotatesAndReturnsNewTokens()
        {
            var user = SampleUser();
            _tokenStore.Setup(s => s.GetActiveReplacementAsync("old")).ReturnsAsync((string?)null);
            _tokenStore.Setup(s => s.GetUserIdByTokenAsync("old")).ReturnsAsync(user.Id);
            _tokenGenerator.Setup(g => g.GenerateRefreshToken()).Returns("new-token");
            _tokenStore
                .Setup(s => s.TryRotateTokenAsync("old", "new-token", user.Id, TimeSpan.FromDays(7), TimeSpan.FromSeconds(30)))
                .ReturnsAsync(true);
            _identityService.Setup(s => s.FindByIdAsync(user.Id)).ReturnsAsync(user);
            _identityService.Setup(s => s.GetRolesAsync(user.Id)).ReturnsAsync(new List<string> { "User" });
            _tokenGenerator.Setup(g => g.GenerateJwtToken(user, It.IsAny<IReadOnlyList<string>>())).Returns("jwt-abc");

            var result = await _sut.RefreshTokenAsync("old");

            Assert.NotNull(result);
            Assert.Equal("new-token", result!.NewRefreshToken);
            Assert.Equal("jwt-abc", result.JwtToken);
        }

        [Fact]
        public async Task RefreshToken_RotationFails_ReturnsNull()
        {
            var user = SampleUser();
            _tokenStore.Setup(s => s.GetActiveReplacementAsync("old")).ReturnsAsync((string?)null);
            _tokenStore.Setup(s => s.GetUserIdByTokenAsync("old")).ReturnsAsync(user.Id);
            _tokenGenerator.Setup(g => g.GenerateRefreshToken()).Returns("new-token");
            _tokenStore
                .Setup(s => s.TryRotateTokenAsync("old", "new-token", user.Id, TimeSpan.FromDays(7), TimeSpan.FromSeconds(30)))
                .ReturnsAsync(false);

            var result = await _sut.RefreshTokenAsync("old");

            Assert.Null(result);
        }

        [Fact]
        public async Task RefreshToken_ActiveReplacementAlreadyExists_ReturnsThatReplacementInstead()
        {
            // Simulates a client retrying with a token that a concurrent request already rotated.
            var user = SampleUser();
            _tokenStore.Setup(s => s.GetActiveReplacementAsync("old")).ReturnsAsync("already-rotated-token");
            _tokenStore.Setup(s => s.GetUserIdByTokenAsync("already-rotated-token")).ReturnsAsync(user.Id);
            _identityService.Setup(s => s.FindByIdAsync(user.Id)).ReturnsAsync(user);
            _identityService.Setup(s => s.GetRolesAsync(user.Id)).ReturnsAsync(new List<string> { "User" });
            _tokenGenerator.Setup(g => g.GenerateJwtToken(user, It.IsAny<IReadOnlyList<string>>())).Returns("jwt-xyz");

            var result = await _sut.RefreshTokenAsync("old");

            Assert.NotNull(result);
            Assert.Equal("already-rotated-token", result!.NewRefreshToken);
            _tokenStore.Verify(s => s.TryRotateTokenAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task RefreshToken_UserDeletedAfterTokenIssued_ReturnsNull()
        {
            var user = SampleUser();
            _tokenStore.Setup(s => s.GetActiveReplacementAsync("old")).ReturnsAsync((string?)null);
            _tokenStore.Setup(s => s.GetUserIdByTokenAsync("old")).ReturnsAsync(user.Id);
            _tokenGenerator.Setup(g => g.GenerateRefreshToken()).Returns("new-token");
            _tokenStore
                .Setup(s => s.TryRotateTokenAsync("old", "new-token", user.Id, TimeSpan.FromDays(7), TimeSpan.FromSeconds(30)))
                .ReturnsAsync(true);
            _identityService.Setup(s => s.FindByIdAsync(user.Id)).ReturnsAsync((IdentityUserInfo?)null);

            var result = await _sut.RefreshTokenAsync("old");

            Assert.Null(result);
        }
    }
}
