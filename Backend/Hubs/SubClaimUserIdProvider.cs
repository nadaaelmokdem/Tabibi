using Microsoft.AspNetCore.SignalR;
using Tabibi.Extensions;

namespace Tabibi.Hubs;

public class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.GetId();
    }
}
