using Tabibi.Application.DTOs;
using Tabibi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Tabibi.Core.Models;

namespace Tabibi.Application.Services;

public class SlotService(IUnitOfWork unitOfWork) : Tabibi.Application.Interfaces.ISlotService
{
    public const int DefaultSlotDurationMins = 30;

    private static readonly AppointmentStatus[] BlockingStatuses =
    [
        AppointmentStatus.Confirmed,
        AppointmentStatus.Pending,
        AppointmentStatus.Completed
    ];

    public static DateTime TruncateToMinute(DateTime value) =>
        new(value.Year, value.Month, value.Day, value.Hour, value.Minute, 0, value.Kind);

    public static bool TimesOverlap(
        DateTime slotStart,
        int slotDurationMins,
        DateTime appointmentStart,
        int appointmentDurationMins)
    {
        var normalizedSlot = TruncateToMinute(slotStart).ToUniversalTime();
        var normalizedAppointment = TruncateToMinute(appointmentStart).ToUniversalTime();

        return normalizedSlot < normalizedAppointment.AddMinutes(appointmentDurationMins)
               && normalizedSlot.AddMinutes(slotDurationMins) > normalizedAppointment;
    }

    public async Task<List<DoctorAvailability>> GetActiveAvailabilitiesAsync(
        long doctorId,
        DateOnly date)
    {
        // First, check if there are any specific-date overrides for this exact date.
        var specificDateSlots = await unitOfWork.DoctorAvailabilities.Query()
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
        return await unitOfWork.DoctorAvailabilities.Query()
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
        if (availability.StartTime < availability.EndTime)
        {
            return time >= availability.StartTime
                   && time.Add(TimeSpan.FromMinutes(durationMins)) <= availability.EndTime;
        }
        else
        {
            var slotEnd = time.Add(TimeSpan.FromMinutes(durationMins));
            var limit = availability.EndTime.Add(TimeSpan.FromHours(24));
            return (time >= availability.StartTime && slotEnd <= limit)
                   || (slotEnd <= availability.EndTime);
        }
    }

    public static bool IsAlignedToSlotGrid(
        DoctorAvailability availability,
        TimeSpan time)
    {
        if (availability.StartTime < availability.EndTime)
        {
            if (time < availability.StartTime || time >= availability.EndTime)
                return false;

            var offsetMinutes = (time - availability.StartTime).TotalMinutes;
            return offsetMinutes % availability.SlotDurationMins == 0;
        }
        else
        {
            if (time >= availability.StartTime)
            {
                var offsetMinutes = (time - availability.StartTime).TotalMinutes;
                return offsetMinutes % availability.SlotDurationMins == 0;
            }
            else if (time < availability.EndTime)
            {
                var offsetMinutes = (time + TimeSpan.FromHours(24) - availability.StartTime).TotalMinutes;
                return offsetMinutes % availability.SlotDurationMins == 0;
            }
            return false;
        }
    }

    public static bool IsSlotWithinAvailability(
        DoctorAvailability availability,
        DateOnly slotDate,
        TimeSpan slotTime,
        int durationMins,
        DateOnly availabilityDate,
        ConsultationType? type = null)
    {
        var slotDurationMins = availability.SlotDurationMins;
        var actualDurationMins = (type == ConsultationType.VideoCall) ? 30 : availability.SlotDurationMins;
        if (availabilityDate == slotDate)
        {
            if (availability.StartTime < availability.EndTime)
            {
                return slotTime >= availability.StartTime
                       && slotTime.Add(TimeSpan.FromMinutes(actualDurationMins)) <= availability.EndTime
                       && (slotTime - availability.StartTime).TotalMinutes % slotDurationMins == 0;
            }
            else
            {
                var slotEnd = slotTime.Add(TimeSpan.FromMinutes(actualDurationMins));
                var limit = availability.EndTime.Add(TimeSpan.FromHours(24));
                return slotTime >= availability.StartTime
                       && slotEnd <= limit
                       && (slotTime - availability.StartTime).TotalMinutes % slotDurationMins == 0;
            }
        }
        else if (availabilityDate == slotDate.AddDays(-1))
        {
            if (availability.StartTime >= availability.EndTime)
            {
                var slotEnd = slotTime.Add(TimeSpan.FromMinutes(actualDurationMins));
                if (slotEnd <= availability.EndTime)
                {
                    var offsetMinutes = (slotTime + TimeSpan.FromHours(24) - availability.StartTime).TotalMinutes;
                    return offsetMinutes % slotDurationMins == 0;
                }
            }
        }
        return false;
    }

    public async Task<List<Appointment>> GetBlockingAppointmentsAsync(
        long doctorId,
        DateOnly date)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);

        return await unitOfWork.Appointments.Query()
            .AsNoTracking()
            .Where(a =>
                a.DoctorId == doctorId &&
                a.ScheduledAt >= dayStart &&
                a.ScheduledAt < dayEnd &&
                a.ConsultationType != ConsultationType.Chat &&
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
        long doctorId,
        DateTime scheduledAt,
        int durationMins = DefaultSlotDurationMins)
    {
        var validation = await ValidateSlotAsync(doctorId, scheduledAt, durationMins);
        return validation.IsValid;
    }

    public async Task<SlotValidationResult> ValidateSlotAsync(
        long doctorId,
        DateTime scheduledAt,
        int durationMins = DefaultSlotDurationMins,
        ConsultationType? type = null)
    {
        if (type == ConsultationType.Chat)
        {
            var doc = await unitOfWork.DoctorProfiles.Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

            if (doc == null)
                return SlotValidationResult.Invalid("Doctor not found.");

            if (!doc.IsVerified)
                return SlotValidationResult.Invalid("Doctor is not verified.");

            return SlotValidationResult.Valid(null);
        }
        if (type == ConsultationType.VideoCall)
        {
            durationMins = 30;
        }

        var normalized = TruncateToMinute(scheduledAt);
        var localNormalized = normalized.Kind == DateTimeKind.Utc 
            ? normalized.ToLocalTime() 
            : DateTime.SpecifyKind(normalized, DateTimeKind.Utc).ToLocalTime();

        var currentMinuteUtc = TruncateToMinute(DateTime.UtcNow);

        if (normalized.ToUniversalTime() < currentMinuteUtc)
            return SlotValidationResult.Invalid("Cannot book a slot in the past.");

        var doctor = await unitOfWork.DoctorProfiles.Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

        if (doctor == null)
            return SlotValidationResult.Invalid("Doctor not found.");

        if (!doctor.IsVerified)
            return SlotValidationResult.Invalid("Doctor is not verified.");

        var date = DateOnly.FromDateTime(localNormalized);
        var currentAvailabilities = await GetActiveAvailabilitiesAsync(doctorId, date);
        var prevAvailabilities = await GetActiveAvailabilitiesAsync(doctorId, date.AddDays(-1));

        if (currentAvailabilities.Count == 0 && prevAvailabilities.Count == 0)
            return SlotValidationResult.Invalid("Doctor has no availability on this day.");

        var slotTime = localNormalized.TimeOfDay;
        var matchingAvailability = currentAvailabilities.FirstOrDefault(a =>
            IsSlotWithinAvailability(a, date, slotTime, durationMins, date, type));

        if (matchingAvailability == null)
        {
            matchingAvailability = prevAvailabilities.FirstOrDefault(a =>
                IsSlotWithinAvailability(a, date, slotTime, durationMins, date.AddDays(-1), type));
        }

        if (matchingAvailability == null)
            return SlotValidationResult.Invalid("Selected time is outside doctor availability.");

        var actualDurationMins = (type == ConsultationType.VideoCall) ? 30 : matchingAvailability.SlotDurationMins;

        var blockingAppointments = await GetBlockingAppointmentsAsync(doctorId, date);

        if (IsBlockedByExistingAppointment(localNormalized, actualDurationMins, blockingAppointments))
            return SlotValidationResult.Invalid("This slot is already booked.");

        return SlotValidationResult.Valid(matchingAvailability);
    }
}



