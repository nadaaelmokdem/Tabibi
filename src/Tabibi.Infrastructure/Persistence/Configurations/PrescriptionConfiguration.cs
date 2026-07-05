using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
    {
        public void Configure(EntityTypeBuilder<Prescription> builder)
        {
            builder.HasKey(p => p.PrescriptionId);

            builder.Property(p => p.Diagnosis).HasMaxLength(500);
            builder.Property(p => p.Notes).HasMaxLength(2000);
            builder.Property(p => p.PdfUrl).HasMaxLength(500);

            builder.HasOne(p => p.Appointment)
                .WithOne(a => a.Prescription)
                .HasForeignKey<Prescription>(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(p => p.Items)
                .WithOne(i => i.Prescription)
                .HasForeignKey(i => i.PrescriptionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(p => p.AppointmentId);
        }
    }

    public class PrescriptionItemConfiguration : IEntityTypeConfiguration<PrescriptionItem>
    {
        public void Configure(EntityTypeBuilder<PrescriptionItem> builder)
        {
            builder.HasKey(i => i.ItemId);

            builder.Property(i => i.MedicationName).IsRequired().HasMaxLength(200);
            builder.Property(i => i.Dosage).HasMaxLength(100);
            builder.Property(i => i.Frequency).HasMaxLength(100);
            builder.Property(i => i.Instructions).HasMaxLength(500);
        }
    }
}
