using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class DoctorReviewConfiguration : IEntityTypeConfiguration<DoctorReview>
    {
        public void Configure(EntityTypeBuilder<DoctorReview> builder)
        {
            builder.HasKey(r => r.ReviewId);
            builder.Property(r => r.Comment).HasMaxLength(1000);

            builder.HasOne(r => r.Appointment)
                .WithOne(a => a.Review)
                .HasForeignKey<DoctorReview>(r => r.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(r => r.AppointmentId);
        }
    }
}
