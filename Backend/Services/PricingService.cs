using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.Models;

namespace Tabibi.Services;

/// <summary>
/// Resolves the appointment price for a given doctor and consultation type
/// using their DoctorProfile flat-price fields (ClinicPrice, ChatPrice, etc.).
/// </summary>
public class PricingService(AppDbContext dbContext)
{
    public async Task<decimal?> GetPriceAsync(int doctorId, ConsultationType type)
    {
        var doctor = await dbContext.DoctorProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.DoctorId == doctorId);

        if (doctor == null)
            return null;

        return type switch
        {
            ConsultationType.Clinic when doctor.IsClinicEnabled => doctor.ClinicPrice,
            ConsultationType.Chat   when doctor.IsChatEnabled   => doctor.ChatPrice,
            ConsultationType.VideoCall when doctor.IsVideoCallEnabled => doctor.VideoCallPrice,
            _ => null
        };
    }
}
