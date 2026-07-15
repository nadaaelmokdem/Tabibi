using Tabibi.Application.Interfaces;
using Tabibi.Application.DTOs;
using Tabibi.Core.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Text.Json;
using Tabibi.Application.Shared;
using System.Collections.Generic;

namespace Tabibi.Application.Services
{
    public class PatientAIService(IUnitOfWork unitOfWork, IAIDoctor aiDoctor, IChatService chatService) : Tabibi.Application.Interfaces.IPatientAIService
    {
        public async Task<ServiceResult<QuotaResponseDTO>> GetQuotaAsync(string userId)
        {
            var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<QuotaResponseDTO>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                await unitOfWork.PatientQuotas.AddAsync(patient.Quota);
            }

            // Daily reset logic
            if (DateTime.UtcNow - patient.Quota.LastAiMessageReset > TimeSpan.FromDays(1))
            {
                patient.Quota.AvailableAiMessages = 15;
                patient.Quota.LastAiMessageReset = DateTime.UtcNow;
            }

            // Monthly GP reset logic
            if (DateTime.UtcNow.Month != patient.Quota.LastFreeGpMessageReset.Month || DateTime.UtcNow.Year != patient.Quota.LastFreeGpMessageReset.Year)
            {
                patient.Quota.AvailableFreeGpMessages = 2;
                patient.Quota.LastFreeGpMessageReset = DateTime.UtcNow;
            }

            await unitOfWork.CompleteAsync();

            return ServiceResult<QuotaResponseDTO>.Success(new QuotaResponseDTO 
            { 
                FreeAiMessages = patient.Quota.AvailableAiMessages, 
                PremiumAiMessages = patient.Quota.AvailablePremiumAiMessages, 
                FreeGpMessages = patient.Quota.AvailableFreeGpMessages 
            });
        }

        public async Task<ServiceResult<RechargeResponseDTO>> RechargeAsync(string userId, decimal amount)
        {
            if (amount < 10 || amount % 10 != 0)
            {
                return ServiceResult<RechargeResponseDTO>.Failure("Amount must be a multiple of 10 LE.");
            }

            var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<RechargeResponseDTO>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                await unitOfWork.PatientQuotas.AddAsync(patient.Quota);
            }

            int messagesToAdd = (int)(amount / 10) * 20;
            patient.Quota.AvailablePremiumAiMessages += messagesToAdd;

            await unitOfWork.CompleteAsync();

            return ServiceResult<RechargeResponseDTO>.Success(new RechargeResponseDTO 
            { 
                Message = "Recharge successful", 
                FreeAiMessages = patient.Quota.AvailableAiMessages, 
                PremiumAiMessages = patient.Quota.AvailablePremiumAiMessages 
            });
        }

        public async Task<ServiceResult<string>> AskAIAsync(string userId, SendAIMessageDTO request)
        {
            var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<string>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                await unitOfWork.PatientQuotas.AddAsync(patient.Quota);
            }

            if (DateTime.UtcNow - patient.Quota.LastAiMessageReset > TimeSpan.FromDays(1))
            {
                patient.Quota.AvailableAiMessages = 15;
                patient.Quota.LastAiMessageReset = DateTime.UtcNow;
            }

            if (patient.Quota.AvailableAiMessages > 0)
            {
                patient.Quota.AvailableAiMessages--;
            }
            else if (patient.Quota.AvailablePremiumAiMessages > 0)
            {
                patient.Quota.AvailablePremiumAiMessages--;
            }
            else
            {
                return ServiceResult<string>.Failure("AI message quota exceeded. Please recharge.");
            }

            await unitOfWork.CompleteAsync();

            var session = await chatService.StartOrGetAISessionAsync(userId, request.SessionId);
            
            // save user's message
            await chatService.SaveMessage(session.SessionId, UserRoles.Patient, request.RequestText);

            var aiResponseString = await aiDoctor.Ask(request.RequestText, request.ContextText);

            // parse JSON and inject sessionId
            var responseJson = JsonDocument.Parse(aiResponseString);
            var responseObj = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson.RootElement.GetRawText());
            if (responseObj != null)
            {
                responseObj["sessionId"] = session.SessionId;
                aiResponseString = JsonSerializer.Serialize(responseObj);
            }

            string userFacingReply = "";
            try
            {
                using var doc = JsonDocument.Parse(aiResponseString);
                if (doc.RootElement.TryGetProperty("user_facing_reply", out var replyElement))
                {
                    userFacingReply = replyElement.GetString() ?? "";
                }

                if (doc.RootElement.TryGetProperty("clinical_assessment", out var assessmentElement))
                {
                    session.SessionSummary = assessmentElement.GetString();
                    await unitOfWork.CompleteAsync();
                }
            }
            catch { }

            await chatService.SaveMessage(session.SessionId, "AI Doctor", userFacingReply);

            return ServiceResult<string>.Success(aiResponseString);
        }

        public async Task<ServiceResult<ChatHistoryResponseDTO>> GetHistoryAsync(string userId, long sessionId)
        {
            var patient = await unitOfWork.PatientProfiles.Query().FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<ChatHistoryResponseDTO>.Failure("Patient not found");

            var session = await unitOfWork.ChatSessions.Query()
                .FirstOrDefaultAsync(s => s.PatientId == patient.PatientId && s.DoctorId == null && s.SessionId == sessionId);

            if (session == null) return ServiceResult<ChatHistoryResponseDTO>.Success(new ChatHistoryResponseDTO 
            { 
                Messages = new List<ChatMessageDTO>(), 
                ClinicalAssessment = "" 
            });

            var history = await chatService.GetHistory(session.SessionId);
            return ServiceResult<ChatHistoryResponseDTO>.Success(new ChatHistoryResponseDTO 
            { 
                Messages = history, 
                ClinicalAssessment = session.SessionSummary ?? "" 
            });
        }
    }
}
