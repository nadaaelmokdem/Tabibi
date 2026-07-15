using System;
using Tabibi.Core.Models;

namespace Tabibi.Application.DTOs;

public class AppointmentFilterDTO
{
    public string? Status { get; set; }
    public ConsultationType? Type { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Search { get; set; }
}

public class AppointmentListDTO
{
    public long DoctorId { get; set; }
    public long AppointmentId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public ConsultationType ConsultationType { get; set; }
    public AppointmentStatus Status { get; set; }
    public int DurationMins { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
    public string? DoctorProfilePictureUrl { get; set; }
    public string? PatientProfilePictureUrl { get; set; }
    public long? SessionId { get; set; }
    public int? ReviewRating { get; set; }
    public string? ReviewComment { get; set; }
}
