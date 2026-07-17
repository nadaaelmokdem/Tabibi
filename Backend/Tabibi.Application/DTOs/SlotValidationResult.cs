namespace Tabibi.Application.DTOs;

using Tabibi.Core.Models;

public sealed class SlotValidationResult
{
    public bool IsValid { get; init; }
    public string ErrorMessage { get; init; } = string.Empty;
    public DoctorAvailability? Availability { get; init; }

    public static SlotValidationResult Valid(DoctorAvailability? availability = null) =>
        new() { IsValid = true, Availability = availability };

    public static SlotValidationResult Invalid(string message) =>
        new() { IsValid = false, ErrorMessage = message };
}
