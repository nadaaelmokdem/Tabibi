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

    public Task<string> GenerateRechargePaymentLinkAsync(AiRecharge recharge, string patientEmail, string patientPhone, string patientName)
    {
        var strategy = paymentGatewayResolver.Resolve(recharge.Gateway);
        return strategy.GenerateRechargePaymentLinkAsync(recharge, patientEmail, patientPhone, patientName);
    }

    public Task<string> GenerateFollowUpPaymentLinkAsync(Payment payment, ChatSession session, string patientEmail, string patientPhone, string patientName)
    {
        var strategy = paymentGatewayResolver.Resolve(payment.Gateway);
        return strategy.GenerateFollowUpPaymentLinkAsync(payment, session, patientEmail, patientPhone, patientName);
    }

    public Task<bool> ValidateWebhookSignatureAsync(PaymentGateway gateway, string payload, string signature)
    {
        var strategy = paymentGatewayResolver.Resolve(gateway);
        return strategy.ValidateWebhookSignatureAsync(payload, signature);
    }

    public async Task<ServiceResult> ProcessWebhookAsync(PaymentGateway gateway, string payload)
    {
        var strategy = paymentGatewayResolver.Resolve(gateway);

        var result = await strategy.ProcessWebhookAsync(payload);
        if (!result.IsSuccess) return ServiceResult.Failure(result.ErrorMessage ?? "Unknown error");

        // --- BRANCH: AI Recharge ---
        if (result.ExternalOrderId?.StartsWith("GEID-AIRECHARGE-") == true)
        {
            return await ProcessAiRechargeWebhookAsync(result);
        }

        // --- BRANCH: Follow-Up Payment ---
        if (result.ExternalOrderId?.StartsWith("GEID-FOLLOWUP-") == true)
        {
            return await ProcessFollowUpWebhookAsync(result);
        }

        // --- BRANCH: Appointment Payment (existing logic) ---
        // SECURITY: Serializable isolation closes the race where duplicate webhook
        // deliveries for the same order are processed concurrently before either commits.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var payment = await dbContext.Payments
            .Include(p => p.Appointment)
            .FirstOrDefaultAsync(p => p.ExternalOrderId == result.ExternalOrderId);

        if (payment == null) return ServiceResult.Failure("Payment not found");

        // Security Check: Gracefully ignore webhooks that attempt to downgrade a Paid payment
        if (payment.Status == PaymentStatus.Paid && result.NewStatus != PaymentStatus.Paid)
        {
            return ServiceResult.Success();
        }

        // SECURITY: Verify the reported amount matches the stored payment amount.
        if (result.NewStatus == PaymentStatus.Paid)
        {
            const decimal tolerance = 0.01m;
            if (Math.Abs(result.Amount - payment.Amount) > tolerance)
            {
                return ServiceResult.Failure($"Payment amount mismatch: expected {payment.Amount}, received {result.Amount}.");
            }

            // SECURITY: Verify the currency matches.
            if (!string.Equals(result.Currency, payment.Currency, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Failure($"Payment currency mismatch: expected {payment.Currency}, received {result.Currency}.");
            }
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
                if (payment.Appointment.VideoCallSessionId != null)
                {
                    var session = await dbContext.VideoCallSessions.FindAsync(payment.Appointment.VideoCallSessionId);
                    if (session != null)
                    {
                        dbContext.VideoCallSessions.Remove(session);
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
                            ConsultationType = payment.Appointment.ConsultationType,
                            Status = SessionStatus.Active,
                            StartedAt = payment.Appointment.ScheduledAt,
                            IsCompanyPaid = false,
                            IsFreeMessage = false,
                            Price = payment.Amount
                        };
                        dbContext.ChatSessions.Add(chatSession);
                        payment.Appointment.ChatSession = chatSession;
                    }
                    else if (payment.Appointment.ConsultationType == ConsultationType.VideoCall && payment.Appointment.VideoCallSessionId == null)
                    {
                        var videoCallSession = new VideoCallSession
                        {
                            PatientId = payment.Appointment.PatientId,
                            DoctorId = payment.Appointment.DoctorId,
                            Status = SessionStatus.Active,
                            StartedAt = payment.Appointment.ScheduledAt,
                            Price = payment.Amount
                        };
                        dbContext.VideoCallSessions.Add(videoCallSession);
                        payment.Appointment.VideoCallSession = videoCallSession;
                    }
                }
            }
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        return ServiceResult.Success();
    }

    private async Task<ServiceResult> ProcessAiRechargeWebhookAsync(PaymentWebhookResult result)
    {
        // SECURITY: Serializable isolation closes the race where duplicate webhook
        // deliveries for the same order are processed concurrently before either commits.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var recharge = await dbContext.AiRecharges
            .Include(r => r.Patient).ThenInclude(p => p.Quota)
            .FirstOrDefaultAsync(r => r.ExternalOrderId == result.ExternalOrderId);

        if (recharge == null)
            return ServiceResult.Failure("AI recharge record not found.");

        // Idempotency guard
        if (recharge.Status == PaymentStatus.Paid)
        {
            return ServiceResult.Success();
        }

        // SECURITY: Verify amount and currency
        if (result.NewStatus == PaymentStatus.Paid)
        {
            const decimal tolerance = 0.01m;
            if (Math.Abs(result.Amount - recharge.Amount) > tolerance)
                return ServiceResult.Failure($"AI recharge amount mismatch: expected {recharge.Amount}, got {result.Amount}.");

            if (!string.Equals(result.Currency, "EGP", StringComparison.OrdinalIgnoreCase))
                return ServiceResult.Failure($"AI recharge currency mismatch: expected EGP, got {result.Currency}.");
        }

        if (result.NewStatus == PaymentStatus.Failed)
        {
            recharge.Status = PaymentStatus.Failed;
        }
        else if (result.NewStatus == PaymentStatus.Paid)
        {
            recharge.Status = PaymentStatus.Paid;
            recharge.PaidAt = DateTime.UtcNow;

            // Credit the quota
            if (recharge.Patient?.Quota != null)
            {
                recharge.Patient.Quota.AvailablePremiumAiMessages += recharge.MessagesGranted;
            }
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        return ServiceResult.Success();
    }

    private async Task<ServiceResult> ProcessFollowUpWebhookAsync(PaymentWebhookResult result)
    {
        // SECURITY: Serializable isolation closes the race where duplicate webhook
        // deliveries for the same order are processed concurrently before either commits.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var payment = await dbContext.Payments
            .Include(p => p.ChatSession)
            .FirstOrDefaultAsync(p => p.ExternalOrderId == result.ExternalOrderId);

        if (payment == null)
            return ServiceResult.Failure("Follow-up payment record not found.");

        // Idempotency
        if (payment.Status == PaymentStatus.Paid)
            return ServiceResult.Success();

        // SECURITY: Verify amount and currency
        if (result.NewStatus == PaymentStatus.Paid)
        {
            const decimal tolerance = 0.01m;
            if (Math.Abs(result.Amount - payment.Amount) > tolerance)
                return ServiceResult.Failure($"Follow-up amount mismatch: expected {payment.Amount}, got {result.Amount}.");

            if (!string.Equals(result.Currency, "EGP", StringComparison.OrdinalIgnoreCase))
                return ServiceResult.Failure($"Follow-up currency mismatch: expected EGP, got {result.Currency}.");
        }

        payment.Status = result.NewStatus;

        if (result.NewStatus == PaymentStatus.Paid && payment.ChatSession != null)
        {
            payment.PaidAt = DateTime.UtcNow;

            // Activate the follow-up on the session
            payment.ChatSession.IsFollowUp = true;
            payment.ChatSession.IsCompanyPaid = false;
            payment.ChatSession.Price = payment.Amount;
            payment.ChatSession.StartedAt = DateTime.UtcNow; 
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        return ServiceResult.Success();
    }
}
