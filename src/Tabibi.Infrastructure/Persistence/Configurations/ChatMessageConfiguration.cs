using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tabibi.Domain.Entities;

namespace Tabibi.Infrastructure.Persistence.Configurations
{
    public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
    {
        public void Configure(EntityTypeBuilder<ChatMessage> builder)
        {
            builder.HasKey(m => m.MessageId);

            builder.Property(m => m.Role).IsRequired().HasMaxLength(10);
            builder.Property(m => m.Content).IsRequired();

            builder.HasIndex(m => m.SessionId);
        }
    }
}
