using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class ChatSessionConfiguration : IEntityTypeConfiguration<ChatSession>
    {
        public void Configure(EntityTypeBuilder<ChatSession> builder)
        {
            builder.HasKey(cs => cs.SessionId);

            builder.Property(cs => cs.Price).HasColumnType("decimal(10,2)");
            builder.Property(cs => cs.DoctorResponseAt).HasColumnType("datetime2");
            builder.Property(cs => cs.SessionSummary).HasMaxLength(2000);

            // Doctor side uses Restrict to avoid multiple cascade paths through Patient.
            builder.HasOne(cs => cs.Doctor)
                .WithMany()
                .HasForeignKey(cs => cs.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(cs => cs.Messages)
                .WithOne(cm => cm.Session)
                .HasForeignKey(cm => cm.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(cs => cs.SymptomAnalysis)
                .WithOne(sa => sa.Session)
                .HasForeignKey<SymptomAnalysis>(sa => sa.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(cs => cs.PatientId);
        }
    }
}
