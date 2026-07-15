using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Core.Models
{
    public class Payment
    {
        [Key]
        public long PaymentId { get; set; }

        public long AppointmentId { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "USD";

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        public PaymentGateway Gateway { get; set; } = PaymentGateway.Stripe;

        [MaxLength(200)]
        public string? GatewayTransactionId { get; set; }

        [MaxLength(200)]
        public string? ExternalOrderId { get; set; }

        public DateTime? PaidAt { get; set; }

        // Navigation
        [ForeignKey(nameof(AppointmentId))]
        public Appointment Appointment { get; set; } = null!;
    }

    public enum PaymentStatus { Pending, Paid, Refunded, Failed }
    public enum PaymentGateway { Stripe, PayPal, Geidea }
}

