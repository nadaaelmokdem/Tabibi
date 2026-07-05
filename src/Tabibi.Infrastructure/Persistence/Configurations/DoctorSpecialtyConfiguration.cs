using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class DoctorSpecialtyConfiguration : IEntityTypeConfiguration<DoctorSpecialty>
    {
        public void Configure(EntityTypeBuilder<DoctorSpecialty> builder)
        {
            builder.HasKey(ds => ds.Id);

            builder.Property(ds => ds.ClinicPrice).HasColumnType("decimal(10,2)");
            builder.Property(ds => ds.ChatPrice).HasColumnType("decimal(10,2)");
            builder.Property(ds => ds.VideoPrice).HasColumnType("decimal(10,2)");
            builder.Property(ds => ds.CallPrice).HasColumnType("decimal(10,2)");

            builder.HasIndex(ds => ds.DoctorId);
            builder.HasIndex(ds => ds.SpecialtyId);
        }
    }
}
