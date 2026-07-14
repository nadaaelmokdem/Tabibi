using System.Data;
using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Services;

public class AppointmentService(
    AppDbContext dbContext,
    SlotService slotService,
    PricingService pricingService,
    AppointmentNotificationService notificationService,
    Tabibi.Services.Payments.PaymentGatewayResolver paymentGatewayResolver)
{
    public async Task<List<AvailableSlotDTO>> GetAvailableSlots(
        int doctorId,
        DateOnly date,
        ConsultationType? consultationType = null)
    {
        var availabilities = await slotService.GetActiveAvailabilitiesAsync(
            doctorId,
            date);

        if (availabilities.Count == 0)
            return [];

        var blockingAppointments = await slotService.GetBlockingAppointmentsAsync(
            doctorId,
            date);

        decimal? price = null;
        if (consultationType.HasValue)
        {
            price = await pricingService.GetPriceAsync(doctorId, consultationType.Value);
        }

        var slots = new List<AvailableSlotDTO>();

        foreach (var availability in availabilities)
        {
            var current = availability.StartTime;
            var slotStep = TimeSpan.FromMinutes(availability.SlotDurationMins);

            while (current + slotStep <= availability.EndTime)
            {
                var start = SlotService.TruncateToMinute(
                    date.ToDateTime(TimeOnly.FromTimeSpan(current)));

                var end = start.AddMinutes(availability.SlotDurationMins);

                var isAvailable = !slotService.IsBlockedByExistingAppointment(
                    start,
                    availability.SlotDurationMins,
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
        int doctorId,
        DateTime scheduledAt,
        int durationMins = SlotService.DefaultSlotDurationMins) =>
        slotService.IsSlotAvailableAsync(doctorId, scheduledAt, durationMins);

    public async Task<ServiceResult<AppointmentBookedDTO>> BookAppointmentAsync(
        string patientUserId,
        BookAppointmentDTO request)
    {
        var patient = await dbContext.PatientProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == patientUserId);

        if (patient == null)
            return ServiceResult<AppointmentBookedDTO>.Failure("Patient profile not found.");

        var normalizedScheduledAt = SlotService.TruncateToMinute(request.ScheduledAt);
        var durationMins = SlotService.DefaultSlotDurationMins;

        var price = await pricingService.GetPriceAsync(request.DoctorId, request.Type);
        if (!price.HasValue)
        {
            return ServiceResult<AppointmentBookedDTO>.Failure(
                "Consultation type is not available for this doctor.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable);

        try
        {
            if (request.Type != ConsultationType.Chat)
            {
                var validation = await slotService.ValidateSlotAsync(
                    request.DoctorId,
                    normalizedScheduledAt,
                    durationMins);

                if (!validation.IsValid)
                {
                    await transaction.RollbackAsync();
                    return ServiceResult<AppointmentBookedDTO>.Failure(validation.ErrorMessage);
                }
            }

            var appointment = new Appointment
            {
                PatientId = patient.PatientId,
                Patient = patient,
                DoctorId = request.DoctorId,
                ScheduledAt = normalizedScheduledAt,
                DurationMins = durationMins,
                ConsultationType = request.Type,
                Status = request.PaymentMethod == PaymentMethod.Online ? AppointmentStatus.Pending : AppointmentStatus.Confirmed,
                Price = price.Value,
                ChiefComplaint = request.ChiefComplaint,
                PaymentMethod = request.PaymentMethod
            };

            dbContext.Appointments.Add(appointment);
            
            if (appointment.ConsultationType == ConsultationType.Chat || appointment.ConsultationType == ConsultationType.VideoCall)
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
                dbContext.ChatSessions.Add(chatSession);
                appointment.ChatSession = chatSession;
            }

            await dbContext.SaveChangesAsync();

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
                dbContext.Payments.Add(payment);
                await dbContext.SaveChangesAsync();

                var strategy = paymentGatewayResolver.Resolve(PaymentGateway.Geidea);
                paymentUrl = await strategy.GeneratePaymentLinkAsync(payment, appointment);
                await dbContext.SaveChangesAsync();
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
                ChiefComplaint = appointment.ChiefComplaint,
                PaymentUrl = paymentUrl
            };

            var doctorUserId = await dbContext.DoctorProfiles
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
            return ServiceResult<AppointmentBookedDTO>.Failure(ex.Message);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return ServiceResult<AppointmentBookedDTO>.Failure(
                "This slot was just booked by another patient. Please choose a different time.");
        }
    }

    public async Task AutoCompleteTodayAppointmentsAsync(int? patientId = null, int? doctorId = null)
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var todayEnd = todayStart.AddDays(1);

        var query = dbContext.Appointments
            .Where(a => a.Status == AppointmentStatus.Confirmed 
                     && a.ScheduledAt >= todayStart 
                     && a.ScheduledAt < todayEnd);

        if (patientId.HasValue) query = query.Where(a => a.PatientId == patientId.Value);
        if (doctorId.HasValue) query = query.Where(a => a.DoctorId == doctorId.Value);

        var toComplete = await query.ToListAsync();
        bool changed = false;

        foreach (var a in toComplete)
        {
            if (now >= a.ScheduledAt.AddMinutes(a.DurationMins))
            {
                a.Status = AppointmentStatus.Completed;
                changed = true;
            }
        }

        if (changed)
        {
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task<List<AppointmentListDTO>> GetDoctorAppointmentsAsync(string doctorUserId, AppointmentFilterDTO filters)
    {
        var doctor = await dbContext.DoctorProfiles.Include(d => d.User).FirstOrDefaultAsync(d => d.UserId == doctorUserId);
        if (doctor == null) return new List<AppointmentListDTO>();

        var query = dbContext.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .Where(a => a.DoctorId == doctor.DoctorId)
            .AsQueryable();

        await AutoCompleteTodayAppointmentsAsync(doctorId: doctor.DoctorId);

        query = ApplyFilters(query, filters);

        return await query
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
                ChiefComplaint = a.ChiefComplaint,
                Notes = a.Notes,
                PatientProfilePictureUrl = null,
                SessionId = a.SessionId
            }).ToListAsync();
    }

    public async Task<List<AppointmentListDTO>> GetPatientAppointmentsAsync(string patientUserId, AppointmentFilterDTO filters)
    {
        var patient = await dbContext.PatientProfiles.Include(p => p.User).FirstOrDefaultAsync(p => p.UserId == patientUserId);
        if (patient == null) return new List<AppointmentListDTO>();

        var query = dbContext.Appointments
            .Include(a => a.Doctor).ThenInclude(d => d.User)
            .Include(a => a.Review)
            .Where(a => a.PatientId == patient.PatientId)
            .AsQueryable();

        await AutoCompleteTodayAppointmentsAsync(patientId: patient.PatientId);

        query = ApplyFilters(query, filters);

        return await query
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
                ChiefComplaint = a.ChiefComplaint,
                Notes = a.Notes,
                DoctorProfilePictureUrl = a.Doctor.ProfilePictureUrl,
                SessionId = a.SessionId,
                ReviewRating = a.Review != null ? a.Review.Rating : null,
                ReviewComment = a.Review != null ? a.Review.Comment : null
            }).ToListAsync();
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

    public async Task<ServiceResult<AppointmentListDTO>> CancelAppointmentAsync(string doctorUserId, int appointmentId)
    {
        var doctor = await dbContext.DoctorProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == doctorUserId);

        if (doctor == null)
            return ServiceResult<AppointmentListDTO>.Failure("Doctor profile not found.");

        var appointment = await dbContext.Appointments
            .Include(a => a.Patient).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId && a.DoctorId == doctor.DoctorId);

        if (appointment == null)
            return ServiceResult<AppointmentListDTO>.Failure("Appointment not found.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            return ServiceResult<AppointmentListDTO>.Failure("Appointment is already cancelled.");

        if (appointment.Status == AppointmentStatus.Completed)
            return ServiceResult<AppointmentListDTO>.Failure("Cannot cancel a completed appointment.");

        appointment.Status = AppointmentStatus.Cancelled;
        await dbContext.SaveChangesAsync();

        var dto = new AppointmentListDTO
        {
            AppointmentId = appointment.AppointmentId,
            DoctorName = doctor.User.FullName,
            PatientName = appointment.Patient.User.FullName,
            ScheduledAt = appointment.ScheduledAt,
            ConsultationType = appointment.ConsultationType,
            Status = appointment.Status,
            DurationMins = appointment.DurationMins,
            Price = appointment.Price,
            ChiefComplaint = appointment.ChiefComplaint,
            Notes = appointment.Notes,
            PatientProfilePictureUrl = null,
            SessionId = appointment.SessionId
        };

        var patientUserId = appointment.Patient.UserId;
        if (!string.IsNullOrEmpty(patientUserId))
        {
            await notificationService.NotifyPatientCancellationAsync(patientUserId, dto);
        }

        return ServiceResult<AppointmentListDTO>.Success(dto);
    }
}
