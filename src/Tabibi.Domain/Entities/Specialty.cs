namespace Tabibi.Domain.Entities
{
    public class Specialty
    {
        public int SpecialtyId { get; set; }

        public string Name { get; set; } = "";

        public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
    }
}
