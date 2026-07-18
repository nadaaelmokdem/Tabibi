using System.Threading.Tasks;

namespace Tabibi.Application.Interfaces
{
    public interface IGoogleMeetService
    {
        Task<string> CreateMeetLinkAsync(long sessionId);
    }
}
