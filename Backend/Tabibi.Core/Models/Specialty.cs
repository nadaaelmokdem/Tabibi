using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Tabibi.Core.Models
{
        public class Specialty
        {
            [Key]
            public long SpecialtyId { get; set; }

            [Required, MaxLength(100)]
            public string Name { get; set; } = "";

            // Navigation
            public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
            public ICollection<DoctorOldSpecialty> DoctorOldSpecialties { get; set; } = new List<DoctorOldSpecialty>();
        }
    }
