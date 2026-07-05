using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> builder)
        {
            builder.HasKey(p => p.PaymentId);

            builder.Property(p => p.Amount).HasColumnType("decimal(10,2)");
            builder.Property(p => p.Currency).HasMaxLength(3);
            builder.Property(p => p.GatewayTransactionId).HasMaxLength(200);

            builder.HasOne(p => p.Appointment)
                .WithOne(a => a.Payment)
                .HasForeignKey<Payment>(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(p => p.AppointmentId);
        }
    }
}
