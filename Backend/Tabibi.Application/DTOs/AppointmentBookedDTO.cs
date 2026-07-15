using Tabibi.Core.Models;

namespace Tabibi.Application.DTOs
{
    public class AppointmentBookedDTO
    {
        public long AppointmentId { get; set; }

        public long DoctorId { get; set; }

        public DateTime ScheduledAt { get; set; }

        public ConsultationType ConsultationType { get; set; }

        public AppointmentStatus Status { get; set; }

        public int DurationMins { get; set; }

        public decimal Price { get; set; }

        public string? PaymentUrl { get; set; }
    }
}
