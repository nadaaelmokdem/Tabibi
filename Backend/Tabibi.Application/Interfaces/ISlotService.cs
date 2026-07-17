using Tabibi.Application.DTOs;
using Tabibi.Core.Models;

namespace Tabibi.Application.Interfaces;

public interface ISlotService
{
    Task<List<DoctorAvailability>> GetActiveAvailabilitiesAsync(long doctorId, DateOnly date);
    Task<List<Appointment>> GetBlockingAppointmentsAsync(long doctorId, DateOnly date);
    bool IsBlockedByExistingAppointment(DateTime slotStart, int slotDurationMins, IReadOnlyList<Appointment> blockingAppointments);
    Task<bool> IsSlotAvailableAsync(long doctorId, DateTime scheduledAt, int durationMins = 30);
    Task<SlotValidationResult> ValidateSlotAsync(long doctorId, DateTime scheduledAt, int durationMins = 30, ConsultationType? type = null);
}

