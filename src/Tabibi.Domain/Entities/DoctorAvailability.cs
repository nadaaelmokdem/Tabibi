namespace Tabibi.Domain.Entities
{
    public class DoctorAvailability
    {
        public int AvailabilityId { get; set; }

        public int DoctorId { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }

        public int SlotDurationMins { get; set; } = 30;

        public bool IsActive { get; set; } = true;

        public DoctorProfile Doctor { get; set; } = null!;
    }
}
