using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Tabibi.Domain.Entities;
using Tabibi.Infrastructure.Identity;

namespace Tabibi.Infrastructure.Persistence
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
    {
        // Core Domain entities
        public DbSet<PatientProfile> PatientProfiles => Set<PatientProfile>();
        public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
        public DbSet<Specialty> Specialties => Set<Specialty>();

        // Doctor relations
        public DbSet<DoctorSpecialty> DoctorSpecialties => Set<DoctorSpecialty>();
        public DbSet<DoctorAvailability> DoctorAvailabilities => Set<DoctorAvailability>();
        public DbSet<DoctorReview> DoctorReviews => Set<DoctorReview>();

        // Chat & AI
        public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<SymptomAnalysis> SymptomAnalyses => Set<SymptomAnalysis>();

        // Appointments & healthcare
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<Prescription> Prescriptions => Set<Prescription>();
        public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();

        // Payments
        public DbSet<Payment> Payments => Set<Payment>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // All entity mapping lives in Configurations/*.cs (IEntityTypeConfiguration<T>)
            // to keep this file small and keep persistence mapping details out of Domain.
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
