using System.ComponentModel.DataAnnotations;
using Tabibi.Models;
using Microsoft.AspNetCore.Identity;

namespace Tabibi.Models
{
    public class AppUser : IdentityUser
    {
        [MaxLength(200)]
        public required string FullName { get; set; }

        public string? GoogleId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public PatientProfile? PatientProfile { get; set; }
        public DoctorProfile? DoctorProfile { get; set; }
    }
}
