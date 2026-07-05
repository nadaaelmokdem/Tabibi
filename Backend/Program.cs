
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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
            builder.Services.AddControllers();

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
            builder.Services.AddScoped<DoctorService>();
            builder.Services.AddScoped<AuthUtils>();
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<TokenService>();
            builder.Services.AddScoped<AdminService>();
            builder.Services.AddSingleton<ITokenStore, InMemoryTokenStore>();
            builder.Services.AddHostedService<TokenCleanupService>();
            builder.Services.AddOpenApi();
            builder.Services.AddSwaggerGen();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddSignalR();
            builder.Services.AddScoped<ChatService>();
            builder.Services.AddCors(options =>
            {
                options.AddPolicy(name: "React Frontend",
                                  policy =>
                                  {
                                      policy
                                             .WithOrigins("http://localhost:5173")
                                            .WithOrigins("http://127.0.0.1:5500")
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

                    // Allow SignalR to authenticate via ?access_token=... on the /hubs path,
                    // since browsers can't attach a normal Authorization header to a WebSocket handshake.
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;

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
                    var adminEmail = builder.Configuration["AdminSeed:Email"];
                    var adminPassword = builder.Configuration["AdminSeed:Password"];
                    var adminFullName = builder.Configuration["AdminSeed:FullName"] ?? "Admin";

                    if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword))
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

            app.Run();
        }
    }
}
