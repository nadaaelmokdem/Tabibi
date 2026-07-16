using Tabibi.Infrastructure.Services;
using Tabibi.Application.Interfaces;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Tabibi.API.Services;
using Tabibi.API.Extensions;
using Tabibi.Application.DTOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Tabibi.Infrastructure.Data;
using Tabibi.Core.Models;
using Tabibi.Application.Services;
using Tabibi.Infrastructure.Services.Payments;
using Tabibi.Application.Shared;
using Tabibi.API.Hubs;
using Tabibi.API.Middlewares;
using Tabibi.Infrastructure.Repositories;
using Tabibi.Infrastructure.Data.Seeders;

namespace Tabibi.API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers(options =>
            {
                options.Filters.Add<Tabibi.API.Filters.ApiResponseFilter>();
            }).AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

            builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
            builder.Services.AddProblemDetails();

            // DbContext
            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlServer(builder.Configuration.GetConnectionString("IdentityConnection"));
            });

            // Identity
            builder.Services.AddIdentity<AppUser, IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>();

            builder.Services.AddScoped<IDataSeeder, DataSeeder>();
            builder.Services.AddScoped<IAIDoctor, AIDoctor>();
            builder.Services.AddScoped<IPatientService, PatientService>();
            builder.Services.AddScoped<IPatientAIService, PatientAIService>();
            builder.Services.AddScoped<IDoctorService, DoctorService>();
            builder.Services.AddScoped<IAuthUtils, AuthUtils>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<IAdminService, AdminService>();
            builder.Services.AddScoped<IPublicService, PublicService>();
            builder.Services.AddSingleton<ITokenStore, InMemoryTokenStore>();
            builder.Services.AddHostedService<TokenCleanupService>();
            builder.Services.AddHostedService<PendingAppointmentCleanupService>();
            builder.Services.AddOpenApi();
            builder.Services.AddSwaggerGen();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient();
            builder.Services.AddSignalR();
            builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();
            builder.Services.AddScoped<IChatService, ChatService>();
            builder.Services.AddScoped<IAppointmentService, AppointmentService>();
            builder.Services.AddScoped<ISlotService, SlotService>();
            builder.Services.AddScoped<IPricingService, PricingService>();
            builder.Services.AddScoped<IAppointmentNotificationService, AppointmentNotificationService>();
            builder.Services.AddScoped<IReviewService, ReviewService>();
            builder.Services.AddScoped<IPaymentService, PaymentService>();
            builder.Services.AddScoped<IFileService, S3FileService>();
            builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
            builder.Services.AddHttpClient<Tabibi.Infrastructure.Services.Payments.GeideaPaymentStrategy>();
            builder.Services.AddScoped<Tabibi.Infrastructure.Services.Payments.PaymentGatewayResolver>();
            builder.Services.AddSingleton<IPresenceTracker, PresenceTracker>();
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
                               "https://gqfah-197-120-163-186.free.pinggy.net",
                               "https://tabibi.dpdns.org")
                                            .AllowAnyHeader()
                                            .AllowAnyMethod()
                                            .AllowCredentials();
                                  });
            });

            builder.Services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter("AuthPolicy", o =>
                {
                    o.Window = TimeSpan.FromMinutes(1);
                    o.PermitLimit = 10;
                    o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    o.QueueLimit = 0;
                });

                options.AddFixedWindowLimiter("WebhookPolicy", o =>
                {
                    o.Window = TimeSpan.FromMinutes(1);
                    o.PermitLimit = 60;
                    o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    o.QueueLimit = 0;
                });

                options.RejectionStatusCode = 429;
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
                var issuer = builder.Configuration["JwtSettings:ValidIssuer"];
                var audience = builder.Configuration["JwtSettings:ValidAudience"];

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !string.IsNullOrEmpty(issuer) && issuer != "empty",
                    ValidateAudience = !string.IsNullOrEmpty(audience) && audience != "empty",
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = !string.IsNullOrEmpty(issuer) && issuer != "empty" ? issuer : null,
                    ValidAudience = !string.IsNullOrEmpty(audience) && audience != "empty" ? audience : null,
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

            app.UseExceptionHandler(_ => { });

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("React Frontend");

            app.UseWebSockets();

            //app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseRateLimiter();

            app.MapControllers();
            app.MapHub<ChatHub>("/hubs/chat");
            app.MapHub<AppointmentHub>("/hubs/appointments");
            app.MapHub<VideoCallHub>("/hubs/videoCall");

            // Seed data
            using (var scope = app.Services.CreateScope())
            {
                var seeder = scope.ServiceProvider.GetRequiredService<IDataSeeder>();
                await seeder.SeedAllAsync();
            }

            await app.RunAsync();
        }
    }
}

