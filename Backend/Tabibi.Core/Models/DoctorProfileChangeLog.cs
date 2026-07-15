using System.ComponentModel.DataAnnotations;

namespace Tabibi.Core.Models
{
    public class DoctorProfileChangeLog
    {
        [Key]
        public long ChangeLogId { get; set; }

        public long DoctorId { get; set; }

        public string FieldName { get; set; } = string.Empty;

        public string? OldValue { get; set; }

        public string? NewValue { get; set; }

        public DateTime ChangedAt { get; set; }

        public string ChangedByUserId { get; set; } = string.Empty;

        public DoctorProfile Doctor { get; set; } = null!;
    }
}

