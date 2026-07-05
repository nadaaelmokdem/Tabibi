using Tabibi.Domain.Enums;

namespace Tabibi.Domain.Entities
{
    public class Payment
    {
        public int PaymentId { get; set; }

        public int AppointmentId { get; set; }

        public decimal Amount { get; set; }

        public string Currency { get; set; } = "USD";

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        public PaymentGateway Gateway { get; set; } = PaymentGateway.Stripe;

        public string? GatewayTransactionId { get; set; }

        public DateTime? PaidAt { get; set; }

        public Appointment Appointment { get; set; } = null!;
    }
}
