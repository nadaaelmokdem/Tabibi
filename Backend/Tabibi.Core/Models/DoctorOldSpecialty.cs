using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Core.Models
{
    public class DoctorOldSpecialty
    {
        [Key]
        public long Id { get; set; }

        public long DoctorId { get; set; }
        public long SpecialtyId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile? Doctor { get; set; }

        [ForeignKey(nameof(SpecialtyId))]
        public Specialty? Specialty { get; set; }
    }
}
