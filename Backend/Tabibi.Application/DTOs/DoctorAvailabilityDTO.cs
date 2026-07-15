using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Tabibi.Application.DTOs;

public class DoctorAvailabilityDTO
{
    public long AvailabilityId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int SlotDurationMins { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? SpecificDate { get; set; }
}

public class UpdateAvailabilityRequestDTO
{
    [Required]
    public List<DoctorAvailabilityDTO> Availabilities { get; set; } = new();
}
