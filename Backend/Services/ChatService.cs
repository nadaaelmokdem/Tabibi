using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;

namespace Tabibi.Services
{
    public class ChatService(AppDbContext dbContext)
    {
        // Confirms this user is actually one of the two participants in the
        // session before letting them join the SignalR group, read history,
        // or send a message. Never trust a sessionId from the client alone.
        public async Task<ChatAccessResult> ValidateAccess(int sessionId, string userId)
        {
            var session = await dbContext.ChatSessions
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor).ThenInclude(d => d!.User)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                return new ChatAccessResult { Allowed = false };
            }

            // Determine if the same user is both patient and doctor in this session
            var isDual = session.Doctor != null && session.Patient.UserId == userId && session.Doctor.UserId == userId;

            if (isDual)
            {
                return new ChatAccessResult { Allowed = false };
            }

            if (session.Patient.UserId == userId)
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = UserRoles.Patient,
                    SenderName = session.Patient.User.FullName
                };
            }

            if (session.Doctor != null && session.Doctor.UserId == userId)
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = UserRoles.Doctor,
                    SenderName = session.Doctor.User.FullName
                };
            }

            return new ChatAccessResult { Allowed = false };


        }

        public async Task<List<ChatMessageDTO>> GetHistory(int sessionId)
        {
            return await dbContext.ChatMessages
                .Where(m => m.SessionId == sessionId)
                .OrderBy(m => m.SentAt)
                .Select(m => new ChatMessageDTO
                {
                    MessageId = m.MessageId,
                    SessionId = m.SessionId,
                    SenderRole = m.Role,
                    SenderUserId = m.Role == UserRoles.Patient
                        ? m.Session.Patient.UserId
                        : (m.Session.Doctor != null ? m.Session.Doctor.UserId : "AI"),
                    SenderName = m.Role == UserRoles.Patient
                        ? m.Session.Patient.User.FullName
                        : (m.Session.Doctor != null ? m.Session.Doctor.User.FullName : "AI Doctor"),
                    Content = m.Content,
                    SentAt = m.SentAt
                })
                .ToListAsync();
        }

        public async Task<ChatSessionDetailsDTO?> GetSessionDetails(int sessionId)
        {
            return await dbContext.ChatSessions
                .Where(s => s.SessionId == sessionId)
                .Select(s => new ChatSessionDetailsDTO
                {
                    SessionId = s.SessionId,
                    DoctorName = s.Doctor != null ? s.Doctor.User.FullName : "AI Medical Assistant",
                    DoctorSpecialty = s.Doctor != null && s.Doctor.DoctorSpecialties.Any() ? string.Join(", ", s.Doctor.DoctorSpecialties.Select(ds => ds.Specialty.Name)) : "AI",
                    PatientName = s.Patient.User.FullName,
                    DoctorId = s.DoctorId,
                    DoctorUserId = s.Doctor != null ? s.Doctor.UserId : "AI",
                    PatientUserId = s.Patient.UserId,
                    IsCompanyPaid = s.IsCompanyPaid,
                    IsFollowUp = s.IsFollowUp,
                    StartedAt = s.StartedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<ChatSessionSummaryDTO>> GetUserSessions(string userId, string role)
        {
            var query = dbContext.ChatSessions.AsQueryable();
            if (role == UserRoles.Patient)
            {
                query = query.Where(s => s.Patient.UserId == userId);
            }
            else
            {
                query = query.Where(s => s.Doctor!.UserId == userId);
            }

            var sessions = await query
                .Select(s => new
                {
                    s.SessionId,
                    s.DoctorId,
                    DoctorName = s.Doctor != null ? s.Doctor.User.FullName : null,
                    DoctorUserId = s.Doctor != null ? s.Doctor.UserId : null,
                    DoctorSpecialties = s.Doctor != null 
                        ? s.Doctor.DoctorSpecialties.Select(ds => ds.Specialty.Name).ToList()
                        : new List<string>(),
                    DoctorProfilePictureUrl = s.Doctor != null ? s.Doctor.ProfilePictureUrl : null,
                    PatientName = s.Patient.User.FullName,
                    PatientUserId = s.Patient.UserId,
                    PatientProfilePictureUrl = (string?)null,
                    LastMessage = dbContext.ChatMessages
                        .Where(m => m.SessionId == s.SessionId && !m.Content.StartsWith("Clinical Assessment:"))
                        .OrderByDescending(m => m.SentAt)
                        .FirstOrDefault()
                })
                .ToListAsync();

                return sessions.Select(s => new ChatSessionSummaryDTO
            {
                SessionId = s.SessionId,
                OtherPartyName = role == UserRoles.Patient ? (s.DoctorName ?? "AI Medical Assistant") : s.PatientName,
                OtherPartyUserId = role == UserRoles.Patient ? (s.DoctorUserId ?? "AI") : s.PatientUserId,
                DoctorId = role == UserRoles.Patient ? s.DoctorId : null,
                OtherPartySpecialty = role == UserRoles.Patient ? (s.DoctorSpecialties.Any() ? string.Join(", ", s.DoctorSpecialties) : "AI") : "",
                LastMessage = s.LastMessage?.Content ?? "",
                LastMessageTime = s.LastMessage?.SentAt,
                LastMessageRole = s.LastMessage?.Role,
                OtherPartyProfilePictureUrl = role == UserRoles.Patient ? s.DoctorProfilePictureUrl : s.PatientProfilePictureUrl
            })
            .OrderByDescending(s => s.LastMessageTime ?? DateTime.MinValue)
            .ToList();
        }

        public async Task<ChatMessage> SaveMessage(int sessionId, string role, string content, bool isSystemMessage = false)
        {
            var session = await dbContext.ChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (session == null) throw new Exception("Session not found");

            // 24-hour expiry check
            if (DateTime.UtcNow - session.StartedAt > TimeSpan.FromDays(1))
            {
                throw new Exception("Session has expired. Please follow up or start a new session.");
            }

            // Free GP 1-message rule
            if (session.IsCompanyPaid && role == UserRoles.Patient && !isSystemMessage && !content.StartsWith("Clinical Assessment:"))
            {
                var patientMessageCount = await dbContext.ChatMessages
                    .CountAsync(m => m.SessionId == sessionId && m.Role == UserRoles.Patient && !m.Content.StartsWith("Clinical Assessment:"));
                
                if (patientMessageCount == 0)
                {
                    var patient = await dbContext.PatientProfiles.Include(p => p.Quota).FirstOrDefaultAsync(p => p.PatientId == session.PatientId);
                    if (patient?.Quota != null)
                    {
                        if (DateTime.UtcNow.Month != patient.Quota.LastFreeGpMessageReset.Month || DateTime.UtcNow.Year != patient.Quota.LastFreeGpMessageReset.Year)
                        {
                            patient.Quota.AvailableFreeGpMessages = 2;
                            patient.Quota.LastFreeGpMessageReset = DateTime.UtcNow;
                        }

                        if (patient.Quota.AvailableFreeGpMessages <= 0)
                        {
                            throw new Exception("No free GP messages available for this month.");
                        }
                        patient.Quota.AvailableFreeGpMessages--;
                    }
                }
                else if (patientMessageCount >= 1)
                {
                    throw new Exception("You can only send one message in a free company-paid session.");
                }
            }

            var message = new ChatMessage
            {
                SessionId = sessionId,
                Role = role,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            dbContext.ChatMessages.Add(message);
            await dbContext.SaveChangesAsync();

            return message;
        }

        public async Task<ChatSession> StartOrGetSessionAsync(string patientUserId, int doctorId, bool isCompanyPaid = false)
        {
            var patient = await dbContext.PatientProfiles.Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == patientUserId);
            if (patient == null)
            {
                throw new Exception("Patient not found.");
            }

            // Verify doctor exists and prevent self-chat
            var doctor = await dbContext.DoctorProfiles.Include(d => d.DoctorSpecialties).FirstOrDefaultAsync(d => d.DoctorId == doctorId);
            if (doctor == null)
            {
                throw new Exception("Doctor not found.");
            }

            if (doctor.UserId == patientUserId)
            {
                throw new Exception("You cannot start a chat session with yourself.");
            }

            if (!doctor.IsVerified)
            {
                throw new Exception("Doctor is not verified.");
            }

            // Check for existing active session first for both paid and unpaid
            var existingSession = await dbContext.ChatSessions
                .FirstOrDefaultAsync(s => s.PatientId == patient.PatientId && s.DoctorId == doctorId && s.IsCompanyPaid == isCompanyPaid && s.Status == SessionStatus.Active && s.StartedAt >= DateTime.UtcNow.AddDays(-1));
            
            if (existingSession != null)
            {
                return existingSession;
            }

            if (isCompanyPaid)
            {
                var hasNonGP = doctor.DoctorSpecialties.Any(ds => ds.SpecialtyId != 18 && ds.SpecialtyId != 20);
                var hasGP = doctor.DoctorSpecialties.Any(ds => ds.SpecialtyId == 18 || ds.SpecialtyId == 20);
                if (hasNonGP || !hasGP) 
                {
                    throw new Exception("This doctor is not eligible for free GP messages.");
                }

                if (patient.Quota == null)
                {
                    patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                    dbContext.PatientQuotas.Add(patient.Quota);
                }
                
                // reset logic for GP
                if (DateTime.UtcNow.Month != patient.Quota.LastFreeGpMessageReset.Month || DateTime.UtcNow.Year != patient.Quota.LastFreeGpMessageReset.Year)
                {
                    patient.Quota.AvailableFreeGpMessages = 2;
                    patient.Quota.LastFreeGpMessageReset = DateTime.UtcNow;
                }

                if (patient.Quota.AvailableFreeGpMessages <= 0)
                {
                    throw new Exception("No free GP messages available for this month.");
                }

                // Quota will be decremented when the first message is sent
            }

            var newSession = new ChatSession
            {
                PatientId = patient.PatientId,
                DoctorId = doctorId,
                ConsultationType = ConsultationType.Chat,
                Status = SessionStatus.Active,
                StartedAt = DateTime.UtcNow,
                IsCompanyPaid = isCompanyPaid,
                IsFreeMessage = isCompanyPaid
            };

            dbContext.ChatSessions.Add(newSession);
            await dbContext.SaveChangesAsync();

            return newSession;
        }

        public async Task<ChatSession> StartOrGetAISessionAsync(string patientUserId, int? sessionId = null)
        {
            var patient = await dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == patientUserId);
            if (patient == null)
            {
                throw new Exception("Patient not found.");
            }

            if (sessionId.HasValue)
            {
                var existingSession = await dbContext.ChatSessions
                    .FirstOrDefaultAsync(s => s.PatientId == patient.PatientId && s.SessionId == sessionId.Value && s.DoctorId == null);

                if (existingSession != null)
                {
                    return existingSession;
                }
            }

            var newSession = new ChatSession
            {
                PatientId = patient.PatientId,
                DoctorId = null,
                ConsultationType = ConsultationType.Chat,
                Status = SessionStatus.Active,
                StartedAt = DateTime.UtcNow
            };

            dbContext.ChatSessions.Add(newSession);
            await dbContext.SaveChangesAsync();

            return newSession;
        }

        public async Task<ChatSession> FollowUpSessionAsync(int sessionId, string patientUserId)
        {
            var session = await dbContext.ChatSessions
                .Include(s => s.Patient)
                .Include(s => s.Doctor)
                .ThenInclude(d => d!.DoctorSpecialties)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.Patient.UserId == patientUserId);

            if (session == null) throw new Exception("Session not found or access denied.");
            
            // "Follow-Up pricing tier: users can pay 40% of the original chat price"
            // For now, we simulate this by just updating the session.
            var doctorChatPrice = session.Doctor?.ChatPrice ?? 0;
            session.Price = doctorChatPrice * 0.4m;
            session.IsFollowUp = true;
            session.IsCompanyPaid = false; // It's no longer free company paid, it's paid now.
            session.StartedAt = DateTime.UtcNow; // Reset clock

            await dbContext.SaveChangesAsync();
            return session;
        }
    }
}
