using System.Data;
using Microsoft.EntityFrameworkCore;
using Tabibi.Application.DTOs;
using Tabibi.Core.Models;
using Tabibi.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Tabibi.Application.Services;

public class AppointmentService(
    IUnitOfWork unitOfWork,
    ISlotService slotService,
    IPricingService pricingService,
    IAppointmentNotificationService notificationService,
    IPaymentService paymentService,
    Microsoft.Extensions.Logging.ILogger<AppointmentService> logger) : IAppointmentService
{
    public async Task<List<AvailableSlotDTO>> GetAvailableSlots(
        long doctorId,
        DateOnly date,
        ConsultationType? consultationType = null)
    {
        decimal? price = null;
        if (consultationType.HasValue)
        {
            price = await pricingService.GetPriceAsync(doctorId, consultationType.Value);
        }

        var currentAvailabilities = await slotService.GetActiveAvailabilitiesAsync(
            doctorId,
            date);

        var prevAvailabilities = await slotService.GetActiveAvailabilitiesAsync(
            doctorId,
            date.AddDays(-1));

        var overnightPrevAvailabilities = prevAvailabilities
            .Where(a => a.StartTime >= a.EndTime)
            .ToList();

        if (currentAvailabilities.Count == 0 && overnightPrevAvailabilities.Count == 0)
            return [];

        var blockingAppointments = await slotService.GetBlockingAppointmentsAsync(
            doctorId,
            date);

        var slots = new List<AvailableSlotDTO>();

        // Generate slots from current day's availabilities
        foreach (var availability in currentAvailabilities)
        {
            var startInterval = availability.SlotDurationMins;
            var sessionDuration = (consultationType == ConsultationType.VideoCall) ? 30 : availability.SlotDurationMins;
            var current = availability.StartTime;
            var slotStep = TimeSpan.FromMinutes(startInterval);
            var durationLimit = TimeSpan.FromMinutes(sessionDuration);

            if (availability.StartTime < availability.EndTime)
            {
                while (current + durationLimit <= availability.EndTime)
                {
                    var startLocal = SlotService.TruncateToMinute(
                        date.ToDateTime(TimeOnly.MinValue).Add(current));
                    var start = startLocal.ToUniversalTime();

                    var end = (consultationType == ConsultationType.Chat) 
                        ? start.AddDays(7) 
                        : start.AddMinutes(sessionDuration);

                    var isAvailable = (consultationType == ConsultationType.Chat)
                        || !slotService.IsBlockedByExistingAppointment(
                            start,
                            sessionDuration,
                            blockingAppointments);

                    if (start > DateTime.UtcNow)
                    {
                        slots.Add(new AvailableSlotDTO
                        {
                            Start = start,
                            End = end,
                            IsAvailable = isAvailable,
                            Price = price
                        });
                    }

                    current += slotStep;
                }
            }
            else
            {
                var limit = availability.EndTime.Add(TimeSpan.FromHours(24));
                while (current < TimeSpan.FromHours(24) && (current + durationLimit <= limit))
                {
                    var startLocal = SlotService.TruncateToMinute(
                        date.ToDateTime(TimeOnly.MinValue).Add(current));
                    var start = startLocal.ToUniversalTime();

                    var end = (consultationType == ConsultationType.Chat)
                        ? start.AddDays(7)
                        : start.AddMinutes(sessionDuration);

                    var isAvailable = (consultationType == ConsultationType.Chat)
                        || !slotService.IsBlockedByExistingAppointment(
                            start,
                            sessionDuration,
                            blockingAppointments);

                    if (start > DateTime.UtcNow)
                    {
                        slots.Add(new AvailableSlotDTO
                        {
                            Start = start,
                            End = end,
                            IsAvailable = isAvailable,
                            Price = price
                        });
                    }

                    current += slotStep;
                }
            }
        }

        // Generate slots from previous day's overnight availabilities
        foreach (var availability in overnightPrevAvailabilities)
        {
            var startInterval = availability.SlotDurationMins;
            var sessionDuration = (consultationType == ConsultationType.VideoCall) ? 30 : availability.SlotDurationMins;
            var slotStep = TimeSpan.FromMinutes(startInterval);
            var durationLimit = TimeSpan.FromMinutes(sessionDuration);
            var current = availability.StartTime;

            while (current < TimeSpan.FromHours(24))
            {
                current += slotStep;
            }

            var limit = availability.EndTime.Add(TimeSpan.FromHours(24));
            while (current + durationLimit <= limit)
            {
                var todayTime = current - TimeSpan.FromHours(24);
                var startLocal = SlotService.TruncateToMinute(
                    date.ToDateTime(TimeOnly.MinValue).Add(todayTime));
                var start = startLocal.ToUniversalTime();

                var end = (consultationType == ConsultationType.Chat)
                    ? start.AddDays(7)
                    : start.AddMinutes(sessionDuration);

                var isAvailable = (consultationType == ConsultationType.Chat)
                    || !slotService.IsBlockedByExistingAppointment(
                        start,
                        sessionDuration,
                        blockingAppointments);

                if (start > DateTime.UtcNow)
                {
                    slots.Add(new AvailableSlotDTO
                    {
                        Start = start,
                        End = end,
                        IsAvailable = isAvailable,
                        Price = price
                    });
                }

                current += slotStep;
            }
        }

        return slots
            .GroupBy(s => s.Start)
            .Select(g => g.First())
            .OrderBy(s => s.Start)
            .ToList();
    }

    public Task<bool> IsSlotAvailableAsync(
        long doctorId,
        DateTime scheduledAt,
        int durationMins = SlotService.DefaultSlotDurationMins) =>
        slotService.IsSlotAvailableAsync(doctorId, scheduledAt, durationMins);

    public async Task<ServiceResult<AppointmentBookedDTO>> BookAppointmentAsync(
        string patientUserId,
        BookAppointmentDTO request)
    {
        var patient = await unitOfWork.PatientProfiles.Query()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == patientUserId);

        if (patient == null)
            return ServiceResult<AppointmentBookedDTO>.Failure("Patient profile not found.");

        var normalizedScheduledAt = SlotService.TruncateToMinute(request.ScheduledAt);
        var durationMins = request.Type switch
        {
            ConsultationType.VideoCall => 30,
            ConsultationType.Chat => 7 * 24 * 60,
            _ => SlotService.DefaultSlotDurationMins
        };

        var price = await pricingService.GetPriceAsync(request.DoctorId, request.Type);
        if (!price.HasValue)
        {
            return ServiceResult<AppointmentBookedDTO>.Failure(
                "Consultation type is not available for this doctor.");
        }

        await using var transaction = await unitOfWork.BeginTransactionAsync(
            IsolationLevel.Serializable);

        try
        {
            var existingAppointment = await unitOfWork.Appointments.Query()
                .AnyAsync(a => a.PatientId == patient.PatientId 
                            && a.DoctorId == request.DoctorId 
                            && a.ScheduledAt == normalizedScheduledAt 
                            && a.Status != AppointmentStatus.Cancelled);

            if (existingAppointment)
            {
                await transaction.RollbackAsync();
                return ServiceResult<AppointmentBookedDTO>.Failure("You already have an appointment with this doctor at this time.");
            }

            var validation = await slotService.ValidateSlotAsync(
                request.DoctorId,
                normalizedScheduledAt,
                durationMins,
                request.Type);

            if (!validation.IsValid)
            {
                await transaction.RollbackAsync();
                return ServiceResult<AppointmentBookedDTO>.Failure(validation.ErrorMessage);
            }

            if (request.PaymentMethod != PaymentMethod.Online && (request.Type == ConsultationType.Chat || request.Type == ConsultationType.VideoCall))
            {
                await transaction.RollbackAsync();
                return ServiceResult<AppointmentBookedDTO>.Failure("Online payment is required for remote consultations (Chat / Video).");
            }

            var actualDurationMins = request.Type switch
            {
                ConsultationType.VideoCall => 30,
                ConsultationType.Chat => 7 * 24 * 60,
                ConsultationType.Clinic => validation.Availability?.SlotDurationMins ?? SlotService.DefaultSlotDurationMins,
                _ => SlotService.DefaultSlotDurationMins
            };

            var appointment = new Appointment
            {
                PatientId = patient.PatientId,
                Patient = patient,
                DoctorId = request.DoctorId,
                ScheduledAt = normalizedScheduledAt,
                DurationMins = actualDurationMins,
                ConsultationType = request.Type,
                Status = request.PaymentMethod == PaymentMethod.Online ? AppointmentStatus.Pending : AppointmentStatus.Confirmed,
                Price = price.Value,
                PaymentMethod = request.PaymentMethod
            };

            await unitOfWork.Appointments.AddAsync(appointment);
            
            if (request.PaymentMethod != PaymentMethod.Online && (appointment.ConsultationType == ConsultationType.Chat || appointment.ConsultationType == ConsultationType.VideoCall))
            {
                if (appointment.ConsultationType == ConsultationType.Chat)
                {
                    var chatSession = new ChatSession
                    {
                        PatientId = patient.PatientId,
                        DoctorId = request.DoctorId,
                        ConsultationType = request.Type,
                        Status = SessionStatus.Active,
                        StartedAt = normalizedScheduledAt,
                        IsCompanyPaid = false,
                        IsFreeMessage = false,
                        Price = price.Value
                    };
                    await unitOfWork.ChatSessions.AddAsync(chatSession);
                    appointment.ChatSession = chatSession;
                }
                else if (appointment.ConsultationType == ConsultationType.VideoCall)
                {
                    var videoCallSession = new VideoCallSession
                    {
                        PatientId = patient.PatientId,
                        DoctorId = request.DoctorId,
                        Status = SessionStatus.Active,
                        StartedAt = normalizedScheduledAt,
                        Price = price.Value
                    };
                    await unitOfWork.VideoCallSessions.AddAsync(videoCallSession);
                    appointment.VideoCallSession = videoCallSession;
                }
            }

            await unitOfWork.CompleteAsync();

            string? paymentUrl = null;
            if (request.PaymentMethod == PaymentMethod.Online)
            {
                var payment = new Payment
                {
                    AppointmentId = appointment.AppointmentId,
                    Amount = price.Value,
                    Currency = "EGP",
                    Status = PaymentStatus.Pending,
                    Gateway = PaymentGateway.Geidea
                };
                await unitOfWork.Payments.AddAsync(payment);
                await unitOfWork.CompleteAsync();

                
                paymentUrl = await paymentService.GeneratePaymentLinkAsync(payment, appointment);
                await unitOfWork.CompleteAsync();
            }

            await transaction.CommitAsync();

            var bookedDto = new AppointmentBookedDTO
            {
                AppointmentId = appointment.AppointmentId,
                DoctorId = appointment.DoctorId,
                ScheduledAt = appointment.ScheduledAt,
                ConsultationType = appointment.ConsultationType,
                Status = appointment.Status,
                DurationMins = appointment.DurationMins,
                Price = appointment.Price,
                PaymentUrl = paymentUrl
            };

            var doctorUserId = await unitOfWork.DoctorProfiles.Query()
                .AsNoTracking()
                .Where(d => d.DoctorId == request.DoctorId)
                .Select(d => d.UserId)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrEmpty(doctorUserId))
            {
                await notificationService.NotifyDoctorNewAppointmentAsync(
                    doctorUserId,
                    bookedDto);
            }

            await notificationService.NotifyPatientConfirmationAsync(
                patientUserId,
                bookedDto);

            return ServiceResult<AppointmentBookedDTO>.Success(bookedDto);
        }
        catch (InvalidOperationException ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Failed to book appointment for patient {PatientId} with doctor {DoctorId} at {ScheduledAt}",
                patient.PatientId, request.DoctorId, request.ScheduledAt);

            // SECURITY: Return a generic message so internal exception details
            // (e.g. detailed Gateway network exceptions/credentials) aren't leaked.
            return ServiceResult<AppointmentBookedDTO>.Failure(
                "Failed to generate payment link. Please try again later or contact support.");
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return ServiceResult<AppointmentBookedDTO>.Failure(
                "This slot was just booked by another patient. Please choose a different time.");
        }
    }

    public async Task AutoCompleteTodayAppointmentsAsync(long? patientId = null, long? doctorId = null)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var todayEnd = todayStart.AddDays(1);

        var query = unitOfWork.Appointments.Query()
            .Where(a => a.Status == AppointmentStatus.Confirmed 
                     && a.ScheduledAt >= todayStart 
                     && a.ScheduledAt < todayEnd);

        if (patientId.HasValue) query = query.Where(a => a.PatientId == patientId.Value);
        if (doctorId.HasValue) query = query.Where(a => a.DoctorId == doctorId.Value);

        var toComplete = await query.ToListAsync();
        bool changed = false;

        foreach (var a in toComplete)
        {
            if (a.ConsultationType == ConsultationType.Clinic && now >= a.ScheduledAt.AddMinutes(a.DurationMins))
            {
                a.Status = AppointmentStatus.Completed;
                changed = true;
            }
            else if (a.ConsultationType == ConsultationType.Chat && now >= a.ScheduledAt.AddDays(7))
            {
                a.Status = AppointmentStatus.Completed;
                changed = true;
            }
        }

        if (changed)
        {
            await unitOfWork.CompleteAsync();
        }
    }

    public async Task<List<AppointmentListDTO>> GetDoctorAppointmentsAsync(string doctorUserId, AppointmentFilterDTO filters)
    {
        var doctor = await unitOfWork.DoctorProfiles.Query().Include(d => d.User).FirstOrDefaultAsync(d => d.UserId == doctorUserId);
        if (doctor == null) return new List<AppointmentListDTO>();

        var query = unitOfWork.Appointments.Query()
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Where(a => a.DoctorId == doctor.DoctorId)
            .AsQueryable();

        await AutoCompleteTodayAppointmentsAsync(doctorId: doctor.DoctorId);

        query = ApplyFilters(query, filters);

        var appointments = await query
            .OrderByDescending(a => a.ScheduledAt)
            .Select(a => new AppointmentListDTO
            {
                AppointmentId = a.AppointmentId,
                DoctorName = doctor.User.FullName,
                PatientName = a.Patient.User.FullName,
                ScheduledAt = a.ScheduledAt,
                ConsultationType = a.ConsultationType,
                Status = a.Status,
                DurationMins = a.DurationMins,
                Price = a.Price,
                Notes = a.Notes,
                PatientProfilePictureUrl = null,
                SessionId = a.ConsultationType == ConsultationType.VideoCall ? a.VideoCallSessionId : a.SessionId,
                PaymentMethod = a.PaymentMethod
            }).ToListAsync();

        foreach (var app in appointments)
        {
            app.ScheduledAt = DateTime.SpecifyKind(app.ScheduledAt, DateTimeKind.Utc);
        }

        return appointments;
    }

    public async Task<List<AppointmentListDTO>> GetPatientAppointmentsAsync(string patientUserId, AppointmentFilterDTO filters)
    {
        var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.User).FirstOrDefaultAsync(p => p.UserId == patientUserId);
        if (patient == null) return new List<AppointmentListDTO>();

        var query = unitOfWork.Appointments.Query()
            .Include(a => a.Doctor).ThenInclude(d => d.User)
            .Include(a => a.Review)
            .Where(a => a.PatientId == patient.PatientId)
            .AsQueryable();

        await AutoCompleteTodayAppointmentsAsync(patientId: patient.PatientId);

        query = ApplyFilters(query, filters);

        var appointments = await query
            .OrderByDescending(a => a.ScheduledAt)
            .Select(a => new AppointmentListDTO
            {
                AppointmentId = a.AppointmentId,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor.User.FullName,
                PatientName = patient.User.FullName,
                ScheduledAt = a.ScheduledAt,
                ConsultationType = a.ConsultationType,
                Status = a.Status,
                DurationMins = a.DurationMins,
                Price = a.Price,
                Notes = a.Notes,
                DoctorProfilePictureUrl = a.Doctor.ProfilePictureUrl,
                SessionId = a.ConsultationType == ConsultationType.VideoCall ? a.VideoCallSessionId : a.SessionId,
                ReviewRating = a.Review != null ? a.Review.Rating : null,
                ReviewComment = a.Review != null ? a.Review.Comment : null,
                PaymentMethod = a.PaymentMethod
            }).ToListAsync();

        foreach (var app in appointments)
        {
            app.ScheduledAt = DateTime.SpecifyKind(app.ScheduledAt, DateTimeKind.Utc);
        }

        return appointments;
    }

    private IQueryable<Appointment> ApplyFilters(IQueryable<Appointment> query, AppointmentFilterDTO filters)
    {
        if (filters.Type.HasValue)
        {
            query = query.Where(a => a.ConsultationType == filters.Type.Value);
        }
        if (!string.IsNullOrEmpty(filters.Status))
        {
            if (Enum.TryParse<AppointmentStatus>(filters.Status, true, out var statusEnum))
            {
                query = query.Where(a => a.Status == statusEnum);
            }
        }
        if (filters.FromDate.HasValue)
        {
            query = query.Where(a => a.ScheduledAt >= filters.FromDate.Value);
        }
        if (filters.ToDate.HasValue)
        {
            var toDateEnd = filters.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(a => a.ScheduledAt <= toDateEnd);
        }
        if (!string.IsNullOrEmpty(filters.Search))
        {
            var search = filters.Search.ToLower();
            query = query.Where(a => a.Patient.User.FullName.ToLower().Contains(search) || a.Doctor.User.FullName.ToLower().Contains(search));
        }
        return query;
    }

    public async Task<ServiceResult<AppointmentListDTO>> CancelAppointmentAsync(string doctorUserId, long appointmentId)
    {
        var doctor = await unitOfWork.DoctorProfiles.Query()
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == doctorUserId);

        if (doctor == null)
            return ServiceResult<AppointmentListDTO>.Failure("Doctor profile not found.");

        var appointment = await unitOfWork.Appointments.Query()
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId && a.DoctorId == doctor.DoctorId);

        if (appointment == null)
            return ServiceResult<AppointmentListDTO>.Failure("Appointment not found.");

        if (appointment.PaymentMethod != PaymentMethod.OnSite)
            return ServiceResult<AppointmentListDTO>.Failure("Only appointments with onsite payment can be cancelled.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            return ServiceResult<AppointmentListDTO>.Failure("Appointment is already cancelled.");

        if (appointment.Status == AppointmentStatus.Completed)
            return ServiceResult<AppointmentListDTO>.Failure("Cannot cancel a completed appointment.");

        appointment.Status = AppointmentStatus.Cancelled;
        await unitOfWork.CompleteAsync();

        var dto = new AppointmentListDTO
        {
            AppointmentId = appointment.AppointmentId,
            DoctorName = doctor.User.FullName,
            PatientName = appointment.Patient.User.FullName,
            ScheduledAt = DateTime.SpecifyKind(appointment.ScheduledAt, DateTimeKind.Utc),
            ConsultationType = appointment.ConsultationType,
            Status = appointment.Status,
            DurationMins = appointment.DurationMins,
            Price = appointment.Price,
            Notes = appointment.Notes,
            PatientProfilePictureUrl = null,
            SessionId = appointment.ConsultationType == ConsultationType.VideoCall ? appointment.VideoCallSessionId : appointment.SessionId,
            PaymentMethod = appointment.PaymentMethod
        };

        var patientUserId = appointment.Patient.UserId;
        if (!string.IsNullOrEmpty(patientUserId))
        {
            await notificationService.NotifyPatientCancellationAsync(patientUserId, dto);
        }

        return ServiceResult<AppointmentListDTO>.Success(dto);
    }
}








