using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Models
{
    public class DoctorOldSpecialty
    {
        [Key]
        public int Id { get; set; }

        public int DoctorId { get; set; }
        public int SpecialtyId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile? Doctor { get; set; }

        [ForeignKey(nameof(SpecialtyId))]
        public Specialty? Specialty { get; set; }
    }
}
