using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Core.Models
{

        public class DoctorSpecialty
        {
            [Key]
            public long Id { get; set; }

            public long DoctorId { get; set; }
            public long SpecialtyId { get; set; }


            // Navigation
            [ForeignKey(nameof(DoctorId))]
            public DoctorProfile Doctor { get; set; } = null!;

            [ForeignKey(nameof(SpecialtyId))]
            public Specialty Specialty { get; set; } = null!;

        }
    }

