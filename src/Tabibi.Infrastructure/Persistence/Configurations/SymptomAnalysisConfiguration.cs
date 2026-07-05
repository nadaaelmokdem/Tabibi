using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class SymptomAnalysisConfiguration : IEntityTypeConfiguration<SymptomAnalysis>
    {
        public void Configure(EntityTypeBuilder<SymptomAnalysis> builder)
        {
            builder.HasKey(sa => sa.AnalysisId);

            builder.Property(sa => sa.SuggestedSpecialty).HasMaxLength(100);
            builder.Property(sa => sa.UrgencyLevel).HasMaxLength(20);
            builder.Property(sa => sa.AiConfidenceScore).HasColumnType("decimal(5,2)");
            builder.Property(sa => sa.Disclaimer).HasMaxLength(500);

            builder.HasOne(sa => sa.RoutedDoctor)
                .WithMany()
                .HasForeignKey(sa => sa.RoutedDoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
