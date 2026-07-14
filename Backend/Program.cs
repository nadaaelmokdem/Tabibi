using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Tabibi.Data;
using Tabibi.Models;
using Tabibi.Services;
using Tabibi.Shared;
using Tabibi.Hubs;

namespace Tabibi
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers(options =>
            {
                options.Filters.Add<Tabibi.Filters.ApiResponseFilter>();
            }).AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

            // DbContext
            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlServer(builder.Configuration.GetConnectionString("IdentityConnection"));
            });

            // Identity
            builder.Services.AddIdentity<AppUser, IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            builder.Services.AddScoped<AIDoctor>();
            builder.Services.AddScoped<PatientService>();
            builder.Services.AddScoped<PatientAIService>();
            builder.Services.AddScoped<DoctorService>();
            builder.Services.AddScoped<AuthUtils>();
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<TokenService>();
            builder.Services.AddScoped<AdminService>();
            builder.Services.AddScoped<PublicService>();
            builder.Services.AddSingleton<ITokenStore, InMemoryTokenStore>();
            builder.Services.AddHostedService<TokenCleanupService>();
            builder.Services.AddHostedService<PendingAppointmentCleanupService>();
            builder.Services.AddOpenApi();
            builder.Services.AddSwaggerGen();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient();
            builder.Services.AddSignalR();
            builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();
            builder.Services.AddScoped<ChatService>();
            builder.Services.AddScoped<AppointmentService>();
            builder.Services.AddScoped<SlotService>();
            builder.Services.AddScoped<PricingService>();
            builder.Services.AddScoped<AppointmentNotificationService>();
            builder.Services.AddScoped<ReviewService>();
            builder.Services.AddScoped<IFileService, S3FileService>();
            builder.Services.AddHttpClient<Tabibi.Services.Payments.GeideaPaymentStrategy>();
            builder.Services.AddScoped<Tabibi.Services.Payments.PaymentGatewayResolver>();
            builder.Services.AddSingleton<PresenceTracker>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy(name: "React Frontend",
                                  policy =>
                                  {
                                      policy.WithOrigins(
                               "http://localhost:5173",
                               "http://localhost:5174",
                               "http://127.0.0.1:5500",
                               "https://bankbook-kleenex-retake.ngrok-free.dev",
                               "https://gqfah-197-120-163-186.free.pinggy.net")
                                            .AllowAnyHeader()
                                            .AllowAnyMethod()
                                            .AllowCredentials();
                                  });
            });

            var jwtSecret = builder.Configuration["JwtSettings:Secret"];
            if (string.IsNullOrEmpty(jwtSecret))
            {
                throw new InvalidOperationException("JWT Secret is not configured.");
            }

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["JwtSettings:ValidIssuer"],
                    ValidAudience = builder.Configuration["JwtSettings:ValidAudience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var path = context.HttpContext.Request.Path;

                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        else if (context.Request.Cookies.ContainsKey("X-Access-Token"))
                        {
                            context.Token = context.Request.Cookies["X-Access-Token"];
                        }

                        return Task.CompletedTask;
                    }
                };
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("React Frontend");

            //app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<ChatHub>("/hubs/chat");
            app.MapHub<AppointmentHub>("/hubs/appointments");
            app.MapHub<VideoCallHub>("/hubs/videoCall");

            // Seed roles
            using (var scope = app.Services.CreateScope())
            {
                var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

                if (!await roleManager.RoleExistsAsync(UserRoles.Patient))
                {
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Patient));
                }

                if (!await roleManager.RoleExistsAsync(UserRoles.Doctor))
                {
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Doctor));
                }

                if (!await roleManager.RoleExistsAsync(UserRoles.Admin))
                {
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Admin));
                }

                // Bootstrap: there is no self-registration path for the Admin role,
                // so seed one admin account from config if none exists yet.
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var existingAdmins = await userManager.GetUsersInRoleAsync(UserRoles.Admin);
                if (existingAdmins.Count == 0)
                {
                    var adminEmail = builder.Configuration["AdminSeed:Email"] ?? "admin@admin.com";
                    var adminPassword = builder.Configuration["AdminSeed:Password"] ?? "Admin@123";
                    var adminFullName = builder.Configuration["AdminSeed:FullName"] ?? "Admin";

                    if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword))
                    {
                        var existingUser = await userManager.FindByEmailAsync(adminEmail);
                        if (existingUser != null)
                        {
                            if (!await userManager.IsInRoleAsync(existingUser, UserRoles.Admin))
                            {
                                await userManager.AddToRoleAsync(existingUser, UserRoles.Admin);
                            }
                        }
                        else
                        {
                            var adminUser = new AppUser
                            {
                                UserName = adminEmail,
                                Email = adminEmail,
                                FullName = adminFullName,
                                EmailConfirmed = true,
                                PhoneNumber = "0000000000",
                                PhoneNumberConfirmed = true
                            };

                            var createResult = await userManager.CreateAsync(adminUser, adminPassword);
                            if (createResult.Succeeded)
                            {
                                await userManager.AddToRoleAsync(adminUser, UserRoles.Admin);
                            }
                        }
                    }
                }
            }

            await app.RunAsync();
        }
    }
}
