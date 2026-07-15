using Tabibi.Application.DTOs;
using Tabibi.Application.Shared;
using Tabibi.Core.Models;

namespace Tabibi.Application.Interfaces;

public interface IChatService
{
    Task<ChatAccessResult> ValidateAccess(long sessionId, string userId);
    Task<List<ChatMessageDTO>> GetHistory(long sessionId);
    Task<ChatSessionDetailsDTO?> GetSessionDetails(long sessionId);
    Task<List<ChatSessionSummaryDTO>> GetUserSessions(string userId, string role);
    Task<ChatMessage> SaveMessage(long sessionId, string role, string content, bool isSystemMessage = false);
    Task<ChatSession> StartOrGetSessionAsync(string patientUserId, long doctorId, bool isCompanyPaid = false);
    Task<ChatSession> StartOrGetAISessionAsync(string patientUserId, long? sessionId = null);
    Task<ChatSession> FollowUpSessionAsync(long sessionId, string patientUserId);
}
