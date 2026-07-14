using Tabibi.DTOs;
using Tabibi.Data;
using Tabibi.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Text.Json;
using Tabibi.Shared;
using System.Collections.Generic;

namespace Tabibi.Services
{
    public class PatientAIService(AppDbContext dbContext, AIDoctor aiDoctor, ChatService chatService)
    {
        public async Task<ServiceResult<dynamic>> GetQuotaAsync(string userId)
        {
            var patient = await dbContext.PatientProfiles.Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<dynamic>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                dbContext.PatientQuotas.Add(patient.Quota);
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

            await dbContext.SaveChangesAsync();

            return ServiceResult<dynamic>.Success(new { freeAiMessages = patient.Quota.AvailableAiMessages, premiumAiMessages = patient.Quota.AvailablePremiumAiMessages, freeGpMessages = patient.Quota.AvailableFreeGpMessages });
        }

        public async Task<ServiceResult<dynamic>> RechargeAsync(string userId, decimal amount)
        {
            if (amount < 10 || amount % 10 != 0)
            {
                return ServiceResult<dynamic>.Failure("Amount must be a multiple of 10 LE.");
            }

            var patient = await dbContext.PatientProfiles.Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<dynamic>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                dbContext.PatientQuotas.Add(patient.Quota);
            }

            int messagesToAdd = (int)(amount / 10) * 20;
            patient.Quota.AvailablePremiumAiMessages += messagesToAdd;

            await dbContext.SaveChangesAsync();

            return ServiceResult<dynamic>.Success(new { message = "Recharge successful", freeAiMessages = patient.Quota.AvailableAiMessages, premiumAiMessages = patient.Quota.AvailablePremiumAiMessages });
        }

        public async Task<ServiceResult<string>> AskAIAsync(string userId, SendAIMessageDTO request)
        {
            var patient = await dbContext.PatientProfiles.Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<string>.Failure("Patient not found");

            if (patient.Quota == null)
            {
                patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                dbContext.PatientQuotas.Add(patient.Quota);
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

            await dbContext.SaveChangesAsync();

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
                    await dbContext.SaveChangesAsync();
                }
            }
            catch { }

            await chatService.SaveMessage(session.SessionId, "AI Doctor", userFacingReply);

            return ServiceResult<string>.Success(aiResponseString);
        }

        public async Task<ServiceResult<dynamic>> GetHistoryAsync(string userId, int sessionId)
        {
            var patient = await dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (patient == null) return ServiceResult<dynamic>.Failure("Patient not found");

            var session = await dbContext.ChatSessions
                .FirstOrDefaultAsync(s => s.PatientId == patient.PatientId && s.DoctorId == null && s.SessionId == sessionId);

            if (session == null) return ServiceResult<dynamic>.Success(new { messages = new List<ChatMessageDTO>(), clinicalAssessment = "" });

            var history = await chatService.GetHistory(session.SessionId);
            return ServiceResult<dynamic>.Success(new { messages = history, clinicalAssessment = session.SessionSummary ?? "" });
        }
    }
}
