using System.ComponentModel.DataAnnotations;
using Tabibi.Core.Models;

namespace Tabibi.Application.DTOs
{
    public class BookAppointmentDTO
    {
        [Required]
        public long DoctorId { get; set; }

        [Required]
        public DateTime ScheduledAt { get; set; }

        [Required]
        public ConsultationType Type { get; set; }

        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Online;
    }
}

