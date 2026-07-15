using Tabibi.Application.Interfaces;
using Tabibi.Core.Models;
using Tabibi.Infrastructure.Services.Payments;

using Tabibi.Application.DTOs;
using Tabibi.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Tabibi.Infrastructure.Services;

public class PaymentService(PaymentGatewayResolver paymentGatewayResolver, AppDbContext dbContext) : IPaymentService
{
    public Task<string> GeneratePaymentLinkAsync(Payment payment, Appointment appointment)
    {
        var strategy = paymentGatewayResolver.Resolve(payment.Gateway);
        return strategy.GeneratePaymentLinkAsync(payment, appointment);
    }

    public async Task<ServiceResult> ProcessWebhookAsync(PaymentGateway gateway, string payload)
    {
        var strategy = paymentGatewayResolver.Resolve(gateway);

        var result = await strategy.ProcessWebhookAsync(payload);
        if (!result.IsSuccess) return ServiceResult.Failure(result.ErrorMessage ?? "Unknown error");

        var payment = await dbContext.Payments
            .Include(p => p.Appointment)
            .FirstOrDefaultAsync(p => p.ExternalOrderId == result.ExternalOrderId);

        if (payment == null) return ServiceResult.Failure("Payment not found");

        // Security Check: Gracefully ignore webhooks that attempt to downgrade a Paid payment
        if (payment.Status == PaymentStatus.Paid && result.NewStatus != PaymentStatus.Paid)
        {
            return ServiceResult.Success();
        }

        if (result.NewStatus == PaymentStatus.Failed)
        {
            if (payment.Appointment != null)
            {
                if (payment.Appointment.SessionId != null)
                {
                    var session = await dbContext.ChatSessions.FindAsync(payment.Appointment.SessionId);
                    if (session != null)
                    {
                        dbContext.ChatSessions.Remove(session);
                    }
                }
                dbContext.Appointments.Remove(payment.Appointment);
            }
            dbContext.Payments.Remove(payment);
        }
        else
        {
            payment.Status = result.NewStatus;
            if (result.NewStatus == PaymentStatus.Paid)
            {
                payment.PaidAt = DateTime.UtcNow;
                if (payment.Appointment != null)
                {
                    payment.Appointment.Status = AppointmentStatus.Confirmed;
                    
                    if (payment.Appointment.ConsultationType == ConsultationType.Chat && payment.Appointment.SessionId == null)
                    {
                        var chatSession = new ChatSession
                        {
                            PatientId = payment.Appointment.PatientId,
                            DoctorId = payment.Appointment.DoctorId,
                            ConsultationType = ConsultationType.Chat,
                            Status = SessionStatus.Active,
                            StartedAt = payment.Appointment.ScheduledAt,
                            IsCompanyPaid = false,
                            IsFreeMessage = false,
                            Price = payment.Amount
                        };
                        dbContext.ChatSessions.Add(chatSession);
                        payment.Appointment.ChatSession = chatSession;
                    }
                }
            }
        }

        await dbContext.SaveChangesAsync();

        return ServiceResult.Success();
    }
}
