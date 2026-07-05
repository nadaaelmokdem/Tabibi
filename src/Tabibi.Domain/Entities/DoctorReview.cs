namespace Tabibi.Domain.Entities
{
    public class DoctorReview
    {
        public int ReviewId { get; set; }

        public int AppointmentId { get; set; }

        public int Rating { get; set; }

        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Appointment Appointment { get; set; } = null!;
    }
}
