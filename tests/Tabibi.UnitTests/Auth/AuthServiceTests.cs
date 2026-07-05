using Moq;
using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.DTOs;
using Tabibi.Application.Auth.Services;
using Tabibi.Application.Common;
using Tabibi.Domain.Entities;
using Tabibi.Domain.Repositories;
using Xunit;

namespace Tabibi.UnitTests.Auth
{
    public class AuthServiceTests
    {
        private readonly Mock<IIdentityService> _identityService = new();
        private readonly Mock<IJwtTokenGenerator> _tokenGenerator = new();
        private readonly Mock<IRefreshTokenStore> _refreshTokenStore = new();
        private readonly Mock<IPatientProfileRepository> _patientRepo = new();
        private readonly Mock<IDoctorProfileRepository> _doctorRepo = new();
        private readonly Mock<IUnitOfWork> _unitOfWork = new();

        private readonly AuthService _sut;

        public AuthServiceTests()
        {
            // Make the fake unit of work actually execute the transactional action,
            // so assertions about what happened *inside* the transaction still work.
            _unitOfWork
                .Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<CancellationToken, Task<bool>>>(), It.IsAny<CancellationToken>()))
                .Returns<Func<CancellationToken, Task<bool>>, CancellationToken>((action, ct) => action(ct));

            _tokenGenerator.Setup(t => t.GenerateRefreshToken()).Returns("refresh-token-123");
            _tokenGenerator
                .Setup(t => t.GenerateJwtToken(It.IsAny<IdentityUserInfo>(), It.IsAny<IReadOnlyList<string>>()))
                .Returns("jwt-token-123");

            _sut = new AuthService(
                _identityService.Object,
                _tokenGenerator.Object,
                _refreshTokenStore.Object,
                _patientRepo.Object,
                _doctorRepo.Object,
                _unitOfWork.Object);
        }

        private static IdentityUserInfo SampleUser(string id = "user-1") =>
            new(id, "jane@example.com", "Jane Doe", "+201000000000", true, DateTime.UtcNow);

        // ---------- Login ----------

        [Fact]
        public async Task Login_WithUnknownEmail_ReturnsFailure()
        {
            _identityService.Setup(s => s.FindByEmailAsync("missing@example.com")).ReturnsAsync((IdentityUserInfo?)null);

            var result = await _sut.LoginAsync(new LoginRequest { Email = "missing@example.com", Password = "x" });

            Assert.False(result.IsSuccess);
            Assert.Equal("User is not registered!", result.ErrorMessage);
        }

        [Fact]
        public async Task Login_WithWrongPassword_ReturnsFailure()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.CheckPasswordAsync(user.Id, "wrong")).ReturnsAsync(PasswordCheckOutcome.Failed);

            var result = await _sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "wrong" });

            Assert.False(result.IsSuccess);
            Assert.Equal("Incorrect username or password!", result.ErrorMessage);
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsTokensAndUser()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.CheckPasswordAsync(user.Id, "correct")).ReturnsAsync(PasswordCheckOutcome.Succeeded);
            _identityService.Setup(s => s.GetRolesAsync(user.Id)).ReturnsAsync(new List<string> { "User" });

            var result = await _sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "correct" });

            Assert.True(result.IsSuccess);
            Assert.Equal("jwt-token-123", result.Data!.Token);
            Assert.Equal("refresh-token-123", result.Data!.RefreshToken);
            Assert.Equal(user.Email, result.Data.User.Email);
            _refreshTokenStore.Verify(s => s.StoreTokenAsync("refresh-token-123", user.Id, TimeSpan.FromDays(7)), Times.Once);
        }

        [Fact]
        public async Task Login_DoctorRole_ReflectsVerificationStatusFromProfile()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.CheckPasswordAsync(user.Id, "correct")).ReturnsAsync(PasswordCheckOutcome.Succeeded);
            _identityService.Setup(s => s.GetRolesAsync(user.Id)).ReturnsAsync(new List<string> { "Doctor" });
            _doctorRepo.Setup(d => d.GetByUserIdAsync(user.Id, default)).ReturnsAsync(new DoctorProfile { UserId = user.Id, IsVerified = true });

            var result = await _sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "correct" });

            Assert.True(result.IsSuccess);
            Assert.True(result.Data!.User.IsVerified);
        }

        // ---------- Register ----------

        [Fact]
        public async Task Register_MissingEmail_ReturnsFailure_WithoutTouchingIdentity()
        {
            var result = await _sut.RegisterAsync(new SignupRequest { Email = "", PhoneNumber = "123", Role = "User" });

            Assert.False(result.IsSuccess);
            Assert.Equal("Email is required!", result.ErrorMessage);
            _identityService.Verify(s => s.CreateUserAsync(It.IsAny<NewIdentityUser>()), Times.Never);
        }

        [Fact]
        public async Task Register_MissingPhoneNumber_ReturnsFailure()
        {
            var result = await _sut.RegisterAsync(new SignupRequest { Email = "a@b.com", PhoneNumber = "", Role = "User" });

            Assert.False(result.IsSuccess);
            Assert.Equal("Phone number is required!", result.ErrorMessage);
        }

        [Fact]
        public async Task Register_IdentityCreationFails_ReturnsJoinedErrors()
        {
            _identityService
                .Setup(s => s.CreateUserAsync(It.IsAny<NewIdentityUser>()))
                .ReturnsAsync((IdentityOperationResult.Failure("Email already taken."), (string?)null));

            var result = await _sut.RegisterAsync(new SignupRequest { Email = "dup@b.com", PhoneNumber = "123", Role = "User" });

            Assert.False(result.IsSuccess);
            Assert.Equal("Email already taken.", result.ErrorMessage);
        }

        [Fact]
        public async Task Register_PatientRole_CreatesPatientProfileAndReturnsTokens()
        {
            var request = new SignupRequest { Email = "pat@b.com", PhoneNumber = "123", Role = "User", FullName = "Pat" };
            var createdUser = SampleUser("new-user-id");

            _identityService
                .Setup(s => s.CreateUserAsync(It.IsAny<NewIdentityUser>()))
                .ReturnsAsync((IdentityOperationResult.Success(), createdUser.Id));
            _identityService.Setup(s => s.AddToRoleAsync(createdUser.Id, "User")).ReturnsAsync(IdentityOperationResult.Success());
            _patientRepo.Setup(r => r.ExistsForUserAsync(createdUser.Id, default)).ReturnsAsync(false);
            _identityService.Setup(s => s.FindByIdAsync(createdUser.Id)).ReturnsAsync(createdUser);
            _identityService.Setup(s => s.GetRolesAsync(createdUser.Id)).ReturnsAsync(new List<string> { "User" });

            var result = await _sut.RegisterAsync(request);

            Assert.True(result.IsSuccess);
            _patientRepo.Verify(r => r.Add(It.Is<PatientProfile>(p => p.UserId == createdUser.Id)), Times.Once);
            _doctorRepo.Verify(r => r.Add(It.IsAny<DoctorProfile>()), Times.Never);
            _unitOfWork.Verify(u => u.SaveChangesAsync(default), Times.Once);
        }

        [Fact]
        public async Task Register_DoctorRole_CreatesDoctorProfile()
        {
            var request = new SignupRequest { Email = "doc@b.com", PhoneNumber = "123", Role = "Doctor", FullName = "Doc" };
            var createdUser = SampleUser("new-doctor-id");

            _identityService
                .Setup(s => s.CreateUserAsync(It.IsAny<NewIdentityUser>()))
                .ReturnsAsync((IdentityOperationResult.Success(), createdUser.Id));
            _identityService.Setup(s => s.AddToRoleAsync(createdUser.Id, "Doctor")).ReturnsAsync(IdentityOperationResult.Success());
            _doctorRepo.Setup(r => r.ExistsForUserAsync(createdUser.Id, default)).ReturnsAsync(false);
            _identityService.Setup(s => s.FindByIdAsync(createdUser.Id)).ReturnsAsync(createdUser);
            _identityService.Setup(s => s.GetRolesAsync(createdUser.Id)).ReturnsAsync(new List<string> { "Doctor" });

            var result = await _sut.RegisterAsync(request);

            Assert.True(result.IsSuccess);
            _doctorRepo.Verify(r => r.Add(It.Is<DoctorProfile>(p => p.UserId == createdUser.Id)), Times.Once);
        }

        [Fact]
        public async Task Register_InvalidRole_RollsBackAndReturnsFailure()
        {
            var request = new SignupRequest { Email = "x@b.com", PhoneNumber = "123", Role = "SuperAdmin", FullName = "X" };
            _identityService
                .Setup(s => s.CreateUserAsync(It.IsAny<NewIdentityUser>()))
                .ReturnsAsync((IdentityOperationResult.Success(), "some-id"));

            var result = await _sut.RegisterAsync(request);

            Assert.False(result.IsSuccess);
            Assert.Contains("Incorrect role", result.ErrorMessage);
            _patientRepo.Verify(r => r.Add(It.IsAny<PatientProfile>()), Times.Never);
            _doctorRepo.Verify(r => r.Add(It.IsAny<DoctorProfile>()), Times.Never);
            _unitOfWork.Verify(u => u.SaveChangesAsync(default), Times.Never);
        }

        // ---------- AddToRole ----------

        [Fact]
        public async Task AddToRole_UnknownUser_ReturnsFailure()
        {
            _identityService.Setup(s => s.FindByEmailAsync("nope@b.com")).ReturnsAsync((IdentityUserInfo?)null);

            var result = await _sut.AddToRoleAsync("nope@b.com", "Doctor");

            Assert.False(result.IsSuccess);
            Assert.Equal("User doesn't exist!", result.ErrorMessage);
        }

        [Fact]
        public async Task AddToRole_InvalidRoleName_ReturnsFailure()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);

            var result = await _sut.AddToRoleAsync(user.Email, "NotARole");

            Assert.False(result.IsSuccess);
            Assert.Contains("Incorrect role", result.ErrorMessage);
        }

        [Fact]
        public async Task AddToRole_Valid_SucceedsAndCreatesMissingProfile()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.AddToRoleAsync(user.Id, "Doctor")).ReturnsAsync(IdentityOperationResult.Success());
            _doctorRepo.Setup(r => r.ExistsForUserAsync(user.Id, default)).ReturnsAsync(false);

            var result = await _sut.AddToRoleAsync(user.Email, "Doctor");

            Assert.True(result.IsSuccess);
            _doctorRepo.Verify(r => r.Add(It.Is<DoctorProfile>(p => p.UserId == user.Id)), Times.Once);
        }

        [Fact]
        public async Task AddToRole_ProfileAlreadyExists_DoesNotDuplicateIt()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.AddToRoleAsync(user.Id, "Doctor")).ReturnsAsync(IdentityOperationResult.Success());
            _doctorRepo.Setup(r => r.ExistsForUserAsync(user.Id, default)).ReturnsAsync(true);

            var result = await _sut.AddToRoleAsync(user.Email, "Doctor");

            Assert.True(result.IsSuccess);
            _doctorRepo.Verify(r => r.Add(It.IsAny<DoctorProfile>()), Times.Never);
        }

        // ---------- CheckMail ----------

        [Fact]
        public async Task CheckMail_UnknownEmail_ReturnsNotFound()
        {
            _identityService.Setup(s => s.FindByEmailAsync("nope@b.com")).ReturnsAsync((IdentityUserInfo?)null);

            var result = await _sut.CheckMailAsync("nope@b.com", isDoctor: false);

            Assert.False(result.IsSuccess);
            Assert.Equal(EmailCheckResult.NotFound, result.Data);
        }

        [Fact]
        public async Task CheckMail_WrongRole_ReturnsWrongRole()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.IsInRoleAsync(user.Id, "Doctor")).ReturnsAsync(false);

            var result = await _sut.CheckMailAsync(user.Email, isDoctor: true);

            Assert.False(result.IsSuccess);
            Assert.Equal(EmailCheckResult.WrongRole, result.Data);
        }

        [Fact]
        public async Task CheckMail_CorrectRole_ReturnsOk()
        {
            var user = SampleUser();
            _identityService.Setup(s => s.FindByEmailAsync(user.Email)).ReturnsAsync(user);
            _identityService.Setup(s => s.IsInRoleAsync(user.Id, "User")).ReturnsAsync(true);

            var result = await _sut.CheckMailAsync(user.Email, isDoctor: false);

            Assert.True(result.IsSuccess);
            Assert.Equal(EmailCheckResult.Ok, result.Data);
        }

        // ---------- Logout ----------

        [Fact]
        public async Task Logout_RevokesToken_ReturnsSuccess()
        {
            _refreshTokenStore.Setup(s => s.RevokeTokenAsync("tok")).ReturnsAsync(true);

            var result = await _sut.LogoutAsync("tok");

            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Logout_TokenAlreadyGone_ReturnsFailure()
        {
            _refreshTokenStore.Setup(s => s.RevokeTokenAsync("tok")).ReturnsAsync(false);

            var result = await _sut.LogoutAsync("tok");

            Assert.False(result.IsSuccess);
        }
    }
}
