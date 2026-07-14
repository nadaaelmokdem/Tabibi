using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.Models;
using Tabibi.Services.Payments;

namespace Tabibi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController(
        AppDbContext dbContext,
        PaymentGatewayResolver paymentGatewayResolver) : ControllerBase
    {
        [HttpPost("webhook/{gatewayString}")]
        public async Task<IActionResult> Webhook(string gatewayString)
        {
            if (!Enum.TryParse<PaymentGateway>(gatewayString, true, out var gateway))
            {
                return BadRequest("Invalid gateway");
            }

            Request.EnableBuffering();
            Request.Body.Position = 0;
            using var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, leaveOpen: true);
            var payload = await reader.ReadToEndAsync();

            var strategy = paymentGatewayResolver.Resolve(gateway);

            var result = await strategy.ProcessWebhookAsync(payload);
            if (!result.IsSuccess) return BadRequest(result.ErrorMessage);

            var payment = await dbContext.Payments
                .Include(p => p.Appointment)
                .FirstOrDefaultAsync(p => p.ExternalOrderId == result.ExternalOrderId);

            if (payment == null) return NotFound("Payment not found");

            // Security Check: Gracefully ignore webhooks that attempt to downgrade a Paid payment
            if (payment.Status == PaymentStatus.Paid && result.NewStatus != PaymentStatus.Paid)
            {
                return Ok();
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

            return Ok();
        }
    }
}
