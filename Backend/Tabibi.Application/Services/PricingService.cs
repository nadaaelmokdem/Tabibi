using Tabibi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Tabibi.Core.Models;

namespace Tabibi.Application.Services;

public class PricingService(IUnitOfWork unitOfWork) : Tabibi.Application.Interfaces.IPricingService
{
    public async Task<decimal?> GetPriceAsync(long doctorId, ConsultationType type)
    {
        var doctor = await unitOfWork.DoctorProfiles.Query()
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





