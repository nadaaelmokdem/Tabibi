using System;
using System.Collections.Generic;
using Tabibi.Models;

namespace Tabibi.DTOs
{
    public class SpecialtyDTO
    {
        public int SpecialtyId { get; set; }
        public string Name { get; set; } = "";
    }

    public class DoctorSearchFilterDTO
    {
        public string? Name { get; set; }
        public int? SpecialtyId { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public List<ConsultationType>? BookingTypes { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PaginatedResultDTO<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    public class DoctorListDTO
    {
        public int DoctorId { get; set; }
        public string UserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string? ProfilePictureUrl { get; set; }
        public decimal AverageRating { get; set; }
        public int? YearsOfExperience { get; set; }
        public string? ClinicLocation { get; set; }
        public string? Bio { get; set; }
        public decimal ClinicPrice { get; set; }
        public bool IsClinicEnabled { get; set; }
        public decimal ChatPrice { get; set; }
        public bool IsChatEnabled { get; set; }
        public decimal VideoCallPrice { get; set; }
        public bool IsVideoCallEnabled { get; set; }

        public List<SpecialtyDTO> Specialties { get; set; } = new List<SpecialtyDTO>();
    }


}
