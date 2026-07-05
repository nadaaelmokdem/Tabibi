using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;
using Tabibi.Infrastructure.Identity;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class PatientProfileConfiguration : IEntityTypeConfiguration<PatientProfile>
    {
        public void Configure(EntityTypeBuilder<PatientProfile> builder)
        {
            builder.HasKey(p => p.PatientId);

            builder.Property(p => p.UserId).IsRequired();
            builder.Property(p => p.EmergencyContact).HasMaxLength(200);
            builder.Property(p => p.Gender).HasConversion<string>().HasMaxLength(10);

            // AppUser (1) -> PatientProfile (1), FK-only relationship: Domain has no
            // reference to the Infrastructure-owned AppUser type.
            builder.HasOne<AppUser>()
                .WithOne()
                .HasForeignKey<PatientProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(p => p.ChatSessions)
                .WithOne(cs => cs.Patient)
                .HasForeignKey(cs => cs.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(p => p.Appointments)
                .WithOne(a => a.Patient)
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
