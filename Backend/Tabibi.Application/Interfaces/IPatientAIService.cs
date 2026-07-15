using Tabibi.Application.DTOs;

namespace Tabibi.Application.Interfaces;

public interface IPatientAIService
{
    Task<ServiceResult<QuotaResponseDTO>> GetQuotaAsync(string userId);
    Task<ServiceResult<RechargeResponseDTO>> RechargeAsync(string userId, decimal amount);
    Task<ServiceResult<string>> AskAIAsync(string userId, SendAIMessageDTO request);
    Task<ServiceResult<ChatHistoryResponseDTO>> GetHistoryAsync(string userId, long sessionId);
}
