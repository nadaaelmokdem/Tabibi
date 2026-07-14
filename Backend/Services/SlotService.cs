using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.Models;

namespace Tabibi.Services;

public class SlotService(AppDbContext dbContext)
{
    public const int DefaultSlotDurationMins = 30;

    private static readonly AppointmentStatus[] BlockingStatuses =
    [
        AppointmentStatus.Confirmed
    ];

    public static DateTime TruncateToMinute(DateTime value) =>
        new(value.Year, value.Month, value.Day, value.Hour, value.Minute, 0, value.Kind);

    public static bool TimesOverlap(
        DateTime slotStart,
        int slotDurationMins,
        DateTime appointmentStart,
        int appointmentDurationMins)
    {
        var normalizedSlot = TruncateToMinute(slotStart);
        var normalizedAppointment = TruncateToMinute(appointmentStart);

        return normalizedSlot < normalizedAppointment.AddMinutes(appointmentDurationMins)
               && normalizedSlot.AddMinutes(slotDurationMins) > normalizedAppointment;
    }

    public async Task<List<DoctorAvailability>> GetActiveAvailabilitiesAsync(
        int doctorId,
        DateOnly date)
    {
        // First, check if there are any specific-date overrides for this exact date.
        var specificDateSlots = await dbContext.DoctorAvailabilities
            .AsNoTracking()
            .Where(a =>
                a.DoctorId == doctorId &&
                a.SpecificDate.HasValue &&
                a.SpecificDate.Value.Date == date.ToDateTime(TimeOnly.MinValue).Date &&
                a.IsActive)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        // If specific overrides exist, use them (they fully override the weekly pattern).
        if (specificDateSlots.Count > 0)
            return specificDateSlots;

        // Otherwise fall back to the generic weekly (DayOfWeek) schedule.
        return await dbContext.DoctorAvailabilities
            .AsNoTracking()
            .Where(a =>
                a.DoctorId == doctorId &&
                !a.SpecificDate.HasValue &&
                a.DayOfWeek == date.DayOfWeek &&
                a.IsActive)
            .OrderBy(a => a.StartTime)
            .ToListAsync();
    }

    public static bool IsTimeWithinAvailability(
        DoctorAvailability availability,
        TimeSpan time,
        int durationMins)
    {
        return time >= availability.StartTime
               && time.Add(TimeSpan.FromMinutes(durationMins)) <= availability.EndTime;
    }

    public static bool IsAlignedToSlotGrid(
        DoctorAvailability availability,
        TimeSpan time)
    {
        if (time < availability.StartTime || time >= availability.EndTime)
            return false;

        var offsetMinutes = (time - availability.StartTime).TotalMinutes;
        return offsetMinutes % availability.SlotDurationMins == 0;
    }

    public async Task<List<Appointment>> GetBlockingAppointmentsAsync(
        int doctorId,
        DateOnly date)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);

        return await dbContext.Appointments
            .AsNoTracking()
            .Where(a =>
                a.DoctorId == doctorId &&
                a.ScheduledAt >= dayStart &&
                a.ScheduledAt < dayEnd &&
                BlockingStatuses.Contains(a.Status))
            .ToListAsync();
    }

    public bool IsBlockedByExistingAppointment(
        DateTime slotStart,
        int slotDurationMins,
        IReadOnlyList<Appointment> blockingAppointments)
    {
        foreach (var appointment in blockingAppointments)
        {
            if (TimesOverlap(slotStart, slotDurationMins, appointment.ScheduledAt, appointment.DurationMins))
                return true;
        }

        return false;
    }

    public async Task<bool> IsSlotAvailableAsync(
        int doctorId,
        DateTime scheduledAt,
        int durationMins = DefaultSlotDurationMins)
    {
        var validation = await ValidateSlotAsync(doctorId, scheduledAt, durationMins);
        return validation.IsValid;
    }

    public async Task<SlotValidationResult> ValidateSlotAsync(
        int doctorId,
        DateTime scheduledAt,
        int durationMins = DefaultSlotDurationMins)
    {
        var normalized = TruncateToMinute(scheduledAt);

        if (normalized <= DateTime.UtcNow)
            return SlotValidationResult.Invalid("Cannot book a slot in the past.");

        var doctor = await dbContext.DoctorProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

        if (doctor == null)
            return SlotValidationResult.Invalid("Doctor not found.");

        if (!doctor.IsVerified)
            return SlotValidationResult.Invalid("Doctor is not verified.");

        var date = DateOnly.FromDateTime(normalized);
        var availabilities = await GetActiveAvailabilitiesAsync(doctorId, date);

        if (availabilities.Count == 0)
            return SlotValidationResult.Invalid("Doctor has no availability on this day.");

        var slotTime = normalized.TimeOfDay;
        var matchingAvailability = availabilities.FirstOrDefault(a =>
            IsTimeWithinAvailability(a, slotTime, durationMins)
            && IsAlignedToSlotGrid(a, slotTime));

        if (matchingAvailability == null)
            return SlotValidationResult.Invalid("Selected time is outside doctor availability.");

        var blockingAppointments = await GetBlockingAppointmentsAsync(doctorId, date);

        if (IsBlockedByExistingAppointment(normalized, durationMins, blockingAppointments))
            return SlotValidationResult.Invalid("This slot is already booked.");

        return SlotValidationResult.Valid(matchingAvailability);
    }
}

public sealed class SlotValidationResult
{
    public bool IsValid { get; init; }
    public string ErrorMessage { get; init; } = string.Empty;
    public DoctorAvailability? Availability { get; init; }

    public static SlotValidationResult Valid(DoctorAvailability availability) =>
        new() { IsValid = true, Availability = availability };

    public static SlotValidationResult Invalid(string message) =>
        new() { IsValid = false, ErrorMessage = message };
}
