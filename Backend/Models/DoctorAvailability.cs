using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{

        public class DoctorAvailability
        {
            [Key]
            public int AvailabilityId { get; set; }

            public int DoctorId { get; set; }

            public DayOfWeek DayOfWeek { get; set; }

            public TimeSpan StartTime { get; set; }
            public TimeSpan EndTime { get; set; }

            public int SlotDurationMins { get; set; } = 30;

            public bool IsActive { get; set; } = true;

            /// <summary>
            /// When set, this availability applies only to this specific calendar date,
            /// overriding any generic DayOfWeek rules for that date.
            /// </summary>
            public DateTime? SpecificDate { get; set; }

            // Navigation
            [ForeignKey(nameof(DoctorId))]
            public DoctorProfile Doctor { get; set; } = null!;
        }
    }

