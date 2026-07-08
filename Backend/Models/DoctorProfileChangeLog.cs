using System.ComponentModel.DataAnnotations;

namespace Tabibi.Models
{
    public class DoctorProfileChangeLog
    {
        [Key]
        public int ChangeLogId { get; set; }

        public int DoctorId { get; set; }

        public string FieldName { get; set; } = string.Empty;

        public string? OldValue { get; set; }

        public string? NewValue { get; set; }

        public DateTime ChangedAt { get; set; }

        public string ChangedByUserId { get; set; } = string.Empty;

        public DoctorProfile Doctor { get; set; } = null!;
    }
}
