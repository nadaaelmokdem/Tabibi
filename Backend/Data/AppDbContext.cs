using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Tabibi.Models;

namespace Tabibi.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
    {
        // Core Models
        public DbSet<PatientProfile> PatientProfiles { get; set; }
        public DbSet<DoctorProfile> DoctorProfiles { get; set; }
        public DbSet<DoctorProfileChangeLog> DoctorProfileChangeLogs { get; set; }
        public DbSet<Specialty> Specialties { get; set; }

        // Doctor Relations
        public DbSet<DoctorSpecialty> DoctorSpecialties { get; set; }
        public DbSet<DoctorOldSpecialty> DoctorOldSpecialties { get; set; }
        public DbSet<DoctorAvailability> DoctorAvailabilities { get; set; }
        public DbSet<DoctorReview> DoctorReviews { get; set; }

        // Chat & AI
        public DbSet<ChatSession> ChatSessions { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<SymptomAnalysis> SymptomAnalyses { get; set; }
        public DbSet<PatientQuota> PatientQuotas { get; set; }

        // Appointments & Healthcare
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Prescription> Prescriptions { get; set; }
        public DbSet<PrescriptionItem> PrescriptionItems { get; set; }

        // Payments
        public DbSet<Payment> Payments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v.ToUniversalTime(),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v.HasValue ? v.Value.ToUniversalTime() : v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (entityType.IsKeyless)
                {
                    continue;
                }

                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                    else if (property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(nullableDateTimeConverter);
                    }
                }
            }

            // ==================== AppUser Configurations ====================
            
            // AppUser to PatientProfile (1:1 optional)
            modelBuilder.Entity<AppUser>()
                .HasOne(u => u.PatientProfile)
                .WithOne(p => p.User)
                .HasForeignKey<PatientProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AppUser>()
                .HasIndex(u => u.PhoneNumber)
                .IsUnique();

            // ==================== PatientProfile Configurations ====================
            
            // PatientProfile to ChatSession (1:many)
            modelBuilder.Entity<PatientProfile>()
                .HasMany(p => p.ChatSessions)
                .WithOne(cs => cs.Patient)
                .HasForeignKey(cs => cs.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            // DoctorProfile to ChatSession (Prevent cascade path)
            modelBuilder.Entity<ChatSession>()
                .HasOne(cs => cs.Doctor)
                .WithMany()
                .HasForeignKey(cs => cs.DoctorId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // PatientProfile to Appointment (1:many)
            modelBuilder.Entity<PatientProfile>()
                .HasMany(p => p.Appointments)
                .WithOne(a => a.Patient)
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            // PatientProfile to PatientQuota (1:1)
            modelBuilder.Entity<PatientProfile>()
                .HasOne(p => p.Quota)
                .WithOne(q => q.Patient)
                .HasForeignKey<PatientQuota>(q => q.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== DoctorProfile Configurations ====================
            
            // DoctorProfile to DoctorSpecialty (1:many)
            modelBuilder.Entity<DoctorProfile>()
                .HasMany(d => d.DoctorSpecialties)
                .WithOne(ds => ds.Doctor)
                .HasForeignKey(ds => ds.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            // DoctorProfile to DoctorOldSpecialty (1:many)
            modelBuilder.Entity<DoctorProfile>()
                .HasMany(d => d.OldSpecialties)
                .WithOne(ds => ds.Doctor)
                .HasForeignKey(ds => ds.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            // DoctorProfile to DoctorAvailability (1:many)
            modelBuilder.Entity<DoctorProfile>()
                .HasMany(d => d.Availabilities)
                .WithOne(da => da.Doctor)
                .HasForeignKey(da => da.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            // DoctorProfile to Appointment (1:many)
            modelBuilder.Entity<DoctorProfile>()
                .HasMany(d => d.Appointments)
                .WithOne(a => a.Doctor)
                .HasForeignKey(a => a.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            // ==================== Specialty Configurations ====================
            
            // Specialty to DoctorSpecialty (1:many)
            modelBuilder.Entity<Specialty>()
                .HasMany(s => s.DoctorSpecialties)
                .WithOne(ds => ds.Specialty)
                .HasForeignKey(ds => ds.SpecialtyId)
                .OnDelete(DeleteBehavior.Cascade);

            // Specialty to DoctorOldSpecialty (1:many)
            modelBuilder.Entity<Specialty>()
                .HasMany(s => s.DoctorOldSpecialties)
                .WithOne(ds => ds.Specialty)
                .HasForeignKey(ds => ds.SpecialtyId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== DoctorSpecialty Configurations ====================
            
            // DoctorSpecialty - composite key
            modelBuilder.Entity<DoctorSpecialty>()
                .HasKey(ds => ds.Id);

            // ==================== DoctorOldSpecialty Configurations ====================
            
            modelBuilder.Entity<DoctorOldSpecialty>()
                .HasKey(ds => ds.Id);

            // ==================== ChatSession Configurations ====================
            
            // ChatSession to ChatMessage (1:many)
            modelBuilder.Entity<ChatSession>()
                .HasMany(cs => cs.Messages)
                .WithOne(cm => cm.Session)
                .HasForeignKey(cm => cm.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ChatSession to SymptomAnalysis (1:1 optional)
            modelBuilder.Entity<ChatSession>()
                .HasOne(cs => cs.SymptomAnalysis)
                .WithOne(sa => sa.Session)
                .HasForeignKey<SymptomAnalysis>(sa => sa.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== SymptomAnalysis Configurations ====================
            
            // SymptomAnalysis to DoctorProfile (RoutedDoctor - optional)
            modelBuilder.Entity<SymptomAnalysis>()
                .HasOne(sa => sa.RoutedDoctor)
                .WithMany()
                .HasForeignKey(sa => sa.RoutedDoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            // ==================== Prescription Configurations ====================
            
            // Prescription to Appointment (1:1 optional)
            modelBuilder.Entity<Prescription>()
                .HasOne(p => p.Appointment)
                .WithOne(a => a.Prescription)
                .HasForeignKey<Prescription>(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== Payment Configurations ====================
            
            // Payment to Appointment (1:1 optional)
            modelBuilder.Entity<Payment>()
                .HasOne(pm => pm.Appointment)
                .WithOne(a => a.Payment)
                .HasForeignKey<Payment>(pm => pm.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== DoctorReview Configurations ====================
            
            // DoctorReview to Appointment (1:1 optional)
            modelBuilder.Entity<DoctorReview>()
                .HasOne(dr => dr.Appointment)
                .WithOne(a => a.Review)
                .HasForeignKey<DoctorReview>(dr => dr.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== PrescriptionItem Configurations ====================
            
            // Prescription to PrescriptionItem (1:many)
            modelBuilder.Entity<Prescription>()
                .HasMany(p => p.Items)
                .WithOne(pi => pi.Prescription)
                .HasForeignKey(pi => pi.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==================== Indexes ====================
            
            // Chat indexes
            modelBuilder.Entity<ChatSession>()
                .HasIndex(cs => cs.PatientId);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(cm => cm.SessionId);

            // Appointment indexes
            modelBuilder.Entity<Appointment>()
                .HasIndex(a => new { a.PatientId, a.DoctorId });

            modelBuilder.Entity<Appointment>()
                .HasIndex(a => a.ScheduledAt);

            // Doctor availability indexes
            modelBuilder.Entity<DoctorAvailability>()
                .HasIndex(da => da.DoctorId);

            // Review indexes
            modelBuilder.Entity<DoctorReview>()
                .HasIndex(dr => dr.AppointmentId);

            // Specialty indexes
            modelBuilder.Entity<DoctorSpecialty>()
                .HasIndex(ds => ds.DoctorId);

            modelBuilder.Entity<DoctorSpecialty>()
                .HasIndex(ds => ds.SpecialtyId);

            modelBuilder.Entity<DoctorOldSpecialty>()
                .HasIndex(ds => ds.DoctorId);

            modelBuilder.Entity<DoctorOldSpecialty>()
                .HasIndex(ds => ds.SpecialtyId);

            // Payment indexes
            modelBuilder.Entity<Payment>()
                .HasIndex(pm => pm.AppointmentId);

            // Prescription indexes
            modelBuilder.Entity<Prescription>()
                .HasIndex(p => p.AppointmentId);

            // ==================== Data Seeding ====================
            modelBuilder.Entity<Specialty>().HasData(
                new Specialty { SpecialtyId = 1, Name = "Dermatology (Skin)" },
                new Specialty { SpecialtyId = 2, Name = "Dentistry (Teeth)" },
                new Specialty { SpecialtyId = 3, Name = "Psychiatry (Mental Health)" },
                new Specialty { SpecialtyId = 4, Name = "Pediatrics and New Born (Child)" },
                new Specialty { SpecialtyId = 5, Name = "Neurology (Brain & Nerves)" },
                new Specialty { SpecialtyId = 6, Name = "Orthopedics (Bones)" },
                new Specialty { SpecialtyId = 7, Name = "Gynaecology and Infertility (Women's Health)" },
                new Specialty { SpecialtyId = 8, Name = "Ear, Nose and Throat (ENT)" },
                new Specialty { SpecialtyId = 9, Name = "Cardiology and Vascular Disease (Heart)" },
                new Specialty { SpecialtyId = 10, Name = "Allergy and Immunology (Immune System)" },
                new Specialty { SpecialtyId = 11, Name = "Andrology and Male Infertility (Men's Health)" },
                new Specialty { SpecialtyId = 12, Name = "Audiology (Hearing)" },
                new Specialty { SpecialtyId = 13, Name = "Cardiology and Thoracic Surgery (Heart & Chest)" },
                new Specialty { SpecialtyId = 14, Name = "Chest and Respiratory (Lungs)" },
                new Specialty { SpecialtyId = 15, Name = "Diabetes and Endocrinology (Glands & Hormones)" },
                new Specialty { SpecialtyId = 16, Name = "Diagnostic Radiology (X-Ray/Imaging)" },
                new Specialty { SpecialtyId = 17, Name = "Dietitian and Nutrition (Diet)" },
                new Specialty { SpecialtyId = 18, Name = "Family Medicine (General Practice)" },
                new Specialty { SpecialtyId = 19, Name = "Gastroenterology and Endoscopy (Digestive System)" },
                new Specialty { SpecialtyId = 20, Name = "General Practice (General)" },
                new Specialty { SpecialtyId = 21, Name = "General Surgery (Surgery)" },
                new Specialty { SpecialtyId = 22, Name = "Geriatrics (Elderly Care)" },
                new Specialty { SpecialtyId = 23, Name = "Hematology (Blood)" },
                new Specialty { SpecialtyId = 24, Name = "Hepatology (Liver)" },
                new Specialty { SpecialtyId = 25, Name = "Internal Medicine (Internal Organs)" },
                new Specialty { SpecialtyId = 26, Name = "Interventional Radiology (Imaging/Procedures)" },
                new Specialty { SpecialtyId = 27, Name = "IVF and Infertility (Fertility)" },
                new Specialty { SpecialtyId = 28, Name = "Laboratories (Lab Tests)" },
                new Specialty { SpecialtyId = 29, Name = "Nephrology (Kidneys)" },
                new Specialty { SpecialtyId = 30, Name = "Neurosurgery (Brain & Spine Surgery)" },
                new Specialty { SpecialtyId = 31, Name = "Obesity and Laparoscopic Surgery (Weight Loss)" },
                new Specialty { SpecialtyId = 32, Name = "Oncology (Cancer)" },
                new Specialty { SpecialtyId = 33, Name = "Oncology Surgery (Cancer Surgery)" },
                new Specialty { SpecialtyId = 34, Name = "Ophthalmology (Eyes)" },
                new Specialty { SpecialtyId = 35, Name = "Osteopathy (Bone & Muscle System)" },
                new Specialty { SpecialtyId = 36, Name = "Pain Management (Pain Relief)" },
                new Specialty { SpecialtyId = 37, Name = "Pediatric Surgery (Child Surgery)" },
                new Specialty { SpecialtyId = 38, Name = "Phoniatrics (Speech & Voice)" },
                new Specialty { SpecialtyId = 39, Name = "Physiotherapy and Sport Injuries (Physical Therapy)" },
                new Specialty { SpecialtyId = 40, Name = "Plastic Surgery (Cosmetic Surgery)" },
                new Specialty { SpecialtyId = 41, Name = "Rheumatology (Joints & Muscles)" },
                new Specialty { SpecialtyId = 42, Name = "Spinal Surgery (Spine)" },
                new Specialty { SpecialtyId = 43, Name = "Urology (Urinary Tract)" },
                new Specialty { SpecialtyId = 44, Name = "Vascular Surgery (Blood Vessels)" }
            );
        }
    }
}
