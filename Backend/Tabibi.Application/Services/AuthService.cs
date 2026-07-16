using Tabibi.Application.Extensions;
using Microsoft.AspNetCore.Identity;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tabibi.Application.DTOs;
using Tabibi.Application.Interfaces;
using Tabibi.Application.Shared;
using Tabibi.Core.Models;

namespace Tabibi.Application.Services;

public class AuthService(
    ITokenStore tokenStore,
    SignInManager<AppUser> signInManager,
    UserManager<AppUser> userManager,
    IAuthUtils authUtils,
    IUnitOfWork unitOfWork,
    ILogger<AuthService> logger,
    Microsoft.Extensions.Configuration.IConfiguration configuration,
    System.Net.Http.IHttpClientFactory httpClientFactory) : IAuthService
{
    public async Task<ServiceResult> Logout(string token)
    {
        if (await tokenStore.RevokeTokenAsync(token))
            return ServiceResult.Success();

        return ServiceResult.Failure("User is not logged in!");
    }

    public async Task<ServiceResult<EmailResultEnum>> CheckMail(string mail, bool isDoctor = false)
    {
        var user = await userManager.FindByEmailAsync(mail);
        if (user is null)
            return ServiceResult<EmailResultEnum>.Failure("Email doesn't exist!", EmailResultEnum.NotFound);

        var roleEnum = isDoctor == false ? UserRoles.Patient : UserRoles.Doctor;
        if (await userManager.IsInRoleAsync(user, roleEnum))
            return ServiceResult<EmailResultEnum>.Success(EmailResultEnum.Ok);

        return ServiceResult<EmailResultEnum>.Failure("Unauthorized user!", EmailResultEnum.WrongRole);
    }

    public async Task<ServiceResult<LoginDTO?>> Login(LoginRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null)
            return ServiceResult<LoginDTO?>.Failure("User is not registered!");

        var res = await signInManager.CheckPasswordSignInAsync(user, req.Password, true);
        if (res.Succeeded)
        {
            var roles = await userManager.GetRolesAsync(user);
            var userResponse = user.ToResponse();
            userResponse.Roles = roles.ToList();

            if (roles.Any(r => string.Equals(r, UserRoles.Doctor, StringComparison.OrdinalIgnoreCase)))
            {
                var doctor = await unitOfWork.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == user.Id);
                userResponse.IsVerified = doctor?.IsVerified ?? false;
                userResponse.ProfilePictureUrl = doctor?.ProfilePictureUrl;
            }

            var refreshToken = authUtils.GenerateRefreshToken();
            TimeSpan tokenLifetime = TimeSpan.FromDays(7);
            await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);

            return ServiceResult<LoginDTO?>.Success(new LoginDTO
            {
                User = userResponse,
                Token = authUtils.GenerateJwtToken(user, roles),
                RefreshToken = refreshToken
            });
        }

        return ServiceResult<LoginDTO?>.Failure("Incorrect username or password!");
    }

    public async Task<ServiceResult<LoginDTO?>> GoogleLogin(GoogleLoginRequest req)
    {
        var payload = await ValidateAccessTokenAsync(req.Token);
        if (payload is null)
        {
            return ServiceResult<LoginDTO?>.Failure("Invalid Google Token");
        }

        var user = await userManager.FindByEmailAsync(payload.Email);
        if (user is null)
        {
            return ServiceResult<LoginDTO?>.Success(new LoginDTO
            {
                IsNewUser = true,
                GoogleName = payload.Name,
                GoogleEmail = payload.Email,
                GoogleToken = req.Token,
                Token = null,
                RefreshToken = null,
                User = null
            });
        }

        var roles = await userManager.GetRolesAsync(user);
        var userResponse = user.ToResponse();
        userResponse.Roles = roles.ToList();

        if (roles.Any(r => string.Equals(r, UserRoles.Doctor, StringComparison.OrdinalIgnoreCase)))
        {
            var doctor = await unitOfWork.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == user.Id);
            userResponse.IsVerified = doctor?.IsVerified ?? false;
            userResponse.ProfilePictureUrl = doctor?.ProfilePictureUrl;
        }

        var refreshToken = authUtils.GenerateRefreshToken();
        TimeSpan tokenLifetime = TimeSpan.FromDays(7);
        await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);

        return ServiceResult<LoginDTO?>.Success(new LoginDTO
        {
            User = userResponse,
            Token = authUtils.GenerateJwtToken(user, roles),
            RefreshToken = refreshToken,
            IsNewUser = false
        });
    }

    public async Task<ServiceResult<LoginDTO?>> GoogleAuthCodeExchange(GoogleAuthCodeRequest req)
    {
        // Exchange the auth code for tokens using Google's token endpoint
        using var httpClient = new HttpClient();
        var tokenResponse = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "code", req.Code },
                { "client_id", configuration["GoogleAuth:ClientId"] ?? "" },
                { "client_secret", configuration["GoogleAuth:ClientSecret"] ?? "" },
                { "redirect_uri", req.RedirectUri },
                { "grant_type", "authorization_code" }
            }),
            CancellationToken.None);

        if (!tokenResponse.IsSuccessStatusCode)
        {
            return ServiceResult<LoginDTO?>.Failure(await tokenResponse.Content.ReadAsStringAsync() ?? "");
        }

        var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
        var tokenResponseObj = System.Text.Json.JsonSerializer.Deserialize<GoogleTokenResponse>(tokenContent, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (tokenResponseObj?.AccessToken == null)
        {
            return ServiceResult<LoginDTO?>.Failure("Failed to exchange auth code for tokens");
        }

        // Fetch user info using the access token
        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResponseObj.AccessToken);
        var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
        if (!userInfoResponse.IsSuccessStatusCode)
        {
            return ServiceResult<LoginDTO?>.Failure("Failed to get user info from Google");
        }

        var userInfoContent = await userInfoResponse.Content.ReadAsStringAsync();
        var userInfo = System.Text.Json.JsonSerializer.Deserialize<GoogleUserInfo>(userInfoContent, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (userInfo == null)
        {
            return ServiceResult<LoginDTO?>.Failure("Failed to parse user info from Google");
        }

        var user = await userManager.FindByEmailAsync(userInfo.Email);
        if (user is null)
        {
            return ServiceResult<LoginDTO?>.Success(new LoginDTO
            {
                User = null,
                Token = null,
                RefreshToken = null,
                IsNewUser = true,
                GoogleName = userInfo.Name,
                GoogleEmail = userInfo.Email,
                GoogleToken = tokenResponseObj.AccessToken
            });
        }
        else
        {
            // Update existing user properties but do not automatically add roles
            user.FullName = userInfo.Name;
            user.Email = userInfo.Email;
            await userManager.UpdateAsync(user);
        }

        var roles = await userManager.GetRolesAsync(user);
        var userResponse = user.ToResponse();
        userResponse.Roles = roles.ToList();

        if (roles.Any(r => string.Equals(r, UserRoles.Doctor, StringComparison.OrdinalIgnoreCase)))
        {
            var doctor = await unitOfWork.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == user.Id);
            userResponse.IsVerified = doctor?.IsVerified ?? false;
            userResponse.ProfilePictureUrl = doctor?.ProfilePictureUrl;
        }

        var refreshToken = authUtils.GenerateRefreshToken();
        TimeSpan tokenLifetime = TimeSpan.FromDays(7);
        await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);

        return ServiceResult<LoginDTO?>.Success(new LoginDTO
        {
            User = userResponse,
            Token = authUtils.GenerateJwtToken(user, roles),
            RefreshToken = refreshToken,
            IsNewUser = false
        });
    }

    public async Task<ServiceResult<LoginDTO?>> Register(SignupRequest signupRequest)
    {
        if (string.IsNullOrEmpty(signupRequest.Email))
            return ServiceResult<LoginDTO?>.Failure("Email is required!");

        if (string.IsNullOrEmpty(signupRequest.PhoneNumber))
            return ServiceResult<LoginDTO?>.Failure("Phone number is required!");

        var phoneExists = await userManager.Users.AnyAsync(u => u.PhoneNumber == signupRequest.PhoneNumber);
        if (phoneExists)
            return ServiceResult<LoginDTO?>.Failure("Phone number is already registered!");

        GoogleUserInfo? googlePayload = null;
        if (!string.IsNullOrEmpty(signupRequest.GoogleToken))
        {
            googlePayload = await ValidateAccessTokenAsync(signupRequest.GoogleToken);
            if (googlePayload is null)
            {
                return ServiceResult<LoginDTO?>.Failure("Invalid Google Token");
            }
            // Use Google's email to ensure it is verified
            signupRequest.Email = googlePayload.Email;
        }

        var user = new AppUser
        {
            UserName = signupRequest.Email,
            FullName = signupRequest.FullName,
            Email = signupRequest.Email,
            EmailConfirmed = googlePayload != null,
            PhoneNumber = signupRequest.PhoneNumber,
            PhoneNumberConfirmed = false
        };

        IdentityResult res;
        if (googlePayload != null)
        {
            var randomPassword = Guid.NewGuid().ToString("N") + "Aa1@";
            res = await userManager.CreateAsync(user, randomPassword);
            if (res.Succeeded)
            {
                await userManager.AddLoginAsync(user, new UserLoginInfo("Google", googlePayload.Subject, "Google"));
            }
        }
        else
        {
            res = await userManager.CreateAsync(user, signupRequest.Password);
        }

        if (!res.Succeeded)
            return ServiceResult<LoginDTO?>.Failure(string.Join(", ", res.Errors.Select(e => e.Description)));

        using var transaction = await unitOfWork.BeginTransactionAsync();
        try
        {
            if (signupRequest.Role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
            {
                await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                await unitOfWork.DoctorProfiles.AddAsync(new DoctorProfile { UserId = user.Id });

            }
            else if (signupRequest.Role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
            {
                await userManager.AddToRoleAsync(user, UserRoles.Patient);
                var patientProfile = new PatientProfile { UserId = user.Id };
                await unitOfWork.PatientProfiles.AddAsync(patientProfile);
                await unitOfWork.PatientQuotas.AddAsync(new PatientQuota { Patient = patientProfile });
            }
            else
            {
                await transaction.RollbackAsync();
                return ServiceResult<LoginDTO?>.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
            }

            await unitOfWork.CompleteAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Registration failed for user {Email}", signupRequest.Email);
            throw;
        }

        var roles = await userManager.GetRolesAsync(user);
        var userResponse = user.ToResponse();
        userResponse.Roles = roles.ToList();

        if (roles.Any(r => string.Equals(r, UserRoles.Doctor, StringComparison.OrdinalIgnoreCase)))
        {
            var doctor = await unitOfWork.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == user.Id);
            userResponse.IsVerified = doctor?.IsVerified ?? false;
            userResponse.ProfilePictureUrl = doctor?.ProfilePictureUrl;
        }

        var refreshToken = authUtils.GenerateRefreshToken();
        TimeSpan tokenLifetime = TimeSpan.FromDays(7);
        await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);

        return ServiceResult<LoginDTO?>.Success(new LoginDTO
        {
            User = userResponse,
            Token = authUtils.GenerateJwtToken(user, roles),
            RefreshToken = refreshToken,
        });
    }

    public async Task<ServiceResult> AddToRole(string email, string role)
    {
        // SECURITY: Never allow elevation to Admin via this endpoint.
        if (role.Equals(UserRoles.Admin, StringComparison.OrdinalIgnoreCase))
            return ServiceResult.Failure("Role assignment to Admin is not permitted through this endpoint.");

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
            return ServiceResult.Failure("User doesn't exist!");

        IdentityResult? res = null;

        using var transaction = await unitOfWork.BeginTransactionAsync();
        try
        {
            if (role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
            {
                res = await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                if (res.Succeeded && !await unitOfWork.DoctorProfiles.Query().AnyAsync(p => p.UserId == user.Id))
                    await unitOfWork.DoctorProfiles.AddAsync(new DoctorProfile { UserId = user.Id });
            }
            else if (role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
            {
                res = await userManager.AddToRoleAsync(user, UserRoles.Patient);
                if (res.Succeeded && !await unitOfWork.PatientProfiles.Query().AnyAsync(p => p.UserId == user.Id))
                {
                    var patientProfile = new PatientProfile { UserId = user.Id };
                    await unitOfWork.PatientProfiles.AddAsync(patientProfile);
                    await unitOfWork.PatientQuotas.AddAsync(new PatientQuota { Patient = patientProfile });
                }
            }
            else
            {
                await transaction.RollbackAsync();
                return ServiceResult.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
            }

            if (res != null && res.Succeeded)
            {
                await unitOfWork.CompleteAsync();
                await transaction.CommitAsync();
                return ServiceResult.Success();
            }
            else
            {
                await transaction.RollbackAsync();
                return ServiceResult.Failure(res != null ? string.Join(", ", res.Errors.Select(e => e.Description)) : "Role assignment failed");
            }
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "AddToRole failed for user {Email}", email);
            throw;
        }
    }

    private async Task<GoogleUserInfo?> ValidateAccessTokenAsync(string accessToken)
    {
        try
        {
            var client = httpClientFactory.CreateClient();
            
            // 1. Verify token audience
            var tokenInfoResponse = await client.GetAsync($"https://oauth2.googleapis.com/tokeninfo?access_token={accessToken}");
            if (!tokenInfoResponse.IsSuccessStatusCode)
            {
                logger.LogWarning("Google TokenInfo validation failed. Status: {Status}", tokenInfoResponse.StatusCode);
                return null;
            }
            
            var tokenInfoContent = await tokenInfoResponse.Content.ReadAsStringAsync();
            var tokenInfo = System.Text.Json.JsonSerializer.Deserialize<GoogleTokenInfo>(tokenInfoContent, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            var expectedClientId = configuration["GoogleAuth:ClientId"] ?? "";
            if (tokenInfo == null || (tokenInfo.Audience != expectedClientId && tokenInfo.Azp != expectedClientId))
            {
                logger.LogWarning("Google Token audience mismatch. Expected: {Expected}, Got: aud: {Audience} / azp: {Azp}", 
                    expectedClientId, tokenInfo?.Audience, tokenInfo?.Azp);
                return null;
            }
            
            // 2. Fetch user profile info
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            var userInfoResponse = await client.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
            if (!userInfoResponse.IsSuccessStatusCode)
            {
                logger.LogWarning("Google UserInfo request failed. Status: {Status}", userInfoResponse.StatusCode);
                return null;
            }
            
            var userInfoContent = await userInfoResponse.Content.ReadAsStringAsync();
            return System.Text.Json.JsonSerializer.Deserialize<GoogleUserInfo>(userInfoContent, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error validating Google access token");
            return null;
        }
    }

    private class GoogleTokenInfo
    {
        [System.Text.Json.Serialization.JsonPropertyName("aud")]
        public string Audience { get; set; } = "";
        
        [System.Text.Json.Serialization.JsonPropertyName("azp")]
        public string Azp { get; set; } = "";
    }

    private class GoogleUserInfo
    {
        [System.Text.Json.Serialization.JsonPropertyName("sub")]
        public string Sub { get; set; } = "";
        
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = "";
        
        [System.Text.Json.Serialization.JsonPropertyName("email")]
        public string Email { get; set; } = "";
        
        [System.Text.Json.Serialization.JsonPropertyName("picture")]
        public string Picture { get; set; } = "";

        public string Subject => Sub;
    }
}



