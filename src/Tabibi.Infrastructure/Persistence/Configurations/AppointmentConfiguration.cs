using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
    {
        public void Configure(EntityTypeBuilder<Appointment> builder)
        {
            builder.HasKey(a => a.AppointmentId);

            builder.Property(a => a.ConsultationType).IsRequired();
            builder.Property(a => a.Price).HasColumnType("decimal(10,2)");
            builder.Property(a => a.ChiefComplaint).HasMaxLength(500);
            builder.Property(a => a.Notes).HasMaxLength(2000);

            builder.HasOne(a => a.ChatSession)
                .WithOne()
                .HasForeignKey<Appointment>(a => a.SessionId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            builder.HasIndex(a => new { a.PatientId, a.DoctorId });
            builder.HasIndex(a => a.ScheduledAt);
        }
    }
}
