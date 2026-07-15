using Tabibi.Core.Models;

namespace Tabibi.Application.DTOs
{
    public class DoctorReviewDTO
    {
        public long ReviewId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public ConsultationType ConsultationType { get; set; }
    }

    public class CreateReviewDTO
    {
        public long AppointmentId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public class PagedReviewsDTO
    {
        public List<DoctorReviewDTO> Reviews { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public double AverageRating { get; set; }
    }
}


