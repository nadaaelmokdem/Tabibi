using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Tabibi.DTOs;

public class DoctorAvailabilityDTO
{
    public int AvailabilityId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int SlotDurationMins { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>When set, this slot applies to a specific date overriding DayOfWeek.</summary>
    public DateTime? SpecificDate { get; set; }
}

public class UpdateAvailabilityRequestDTO
{
    [Required]
    public List<DoctorAvailabilityDTO> Availabilities { get; set; } = new();
}
