using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;
using Tabibi.Infrastructure.Identity;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class DoctorProfileConfiguration : IEntityTypeConfiguration<DoctorProfile>
    {
        public void Configure(EntityTypeBuilder<DoctorProfile> builder)
        {
            builder.HasKey(d => d.DoctorId);

            builder.Property(d => d.UserId).IsRequired();
            builder.Property(d => d.AverageRating).HasColumnType("decimal(3,2)");

            // AppUser (1) -> DoctorProfile (1), FK-only relationship.
            builder.HasOne<AppUser>()
                .WithOne()
                .HasForeignKey<DoctorProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(d => d.DoctorSpecialties)
                .WithOne(ds => ds.Doctor)
                .HasForeignKey(ds => ds.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(d => d.Availabilities)
                .WithOne(da => da.Doctor)
                .HasForeignKey(da => da.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(d => d.Appointments)
                .WithOne(a => a.Doctor)
                .HasForeignKey(a => a.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
