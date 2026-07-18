using Tabibi.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Tabibi.Application.DTOs;
using Tabibi.Core.Models;
using Tabibi.Application.Shared;

namespace Tabibi.Application.Services
{
    public class ChatService(IUnitOfWork unitOfWork, IPaymentService paymentService) : Tabibi.Application.Interfaces.IChatService
    {
        // Confirms this user is actually one of the two participants in the
        // session before letting them join the SignalR group, read history,
        // or send a message. Never trust a sessionId from the client alone.
        public async Task<ChatAccessResult> ValidateAccess(long sessionId, string userId)
        {
            var session = await unitOfWork.ChatSessions.Query()
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor).ThenInclude(d => d!.User)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                return new ChatAccessResult { Allowed = false };
            }

            // Determine if the same user is both patient and doctor in this session
            var isDual = session.Doctor != null 
                && session.Patient.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) 
                && session.Doctor.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase);

            if (isDual)
            {
                return new ChatAccessResult { Allowed = false };
            }

            if (session.Patient.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = UserRoles.Patient,
                    SenderName = session.Patient.User.FullName
                };
            }

            if (session.Doctor != null && session.Doctor.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
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

        public async Task<ChatAccessResult> ValidateVideoCallAccess(long sessionId, string userId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor).ThenInclude(d => d!.User)
                .Include(s => s.Appointment)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                return new ChatAccessResult { Allowed = false, ErrorMessage = "Video call session not found." };
            }

            if (session.Status == SessionStatus.Completed)
            {
                return new ChatAccessResult { Allowed = false, ErrorMessage = "This video call session has already been completed." };
            }

            if (session.Appointment != null && DateTime.UtcNow < session.Appointment.ScheduledAt)
            {
                return new ChatAccessResult 
                { 
                    Allowed = false, 
                    ErrorMessage = $"This video call appointment has not started yet. It is scheduled to start at {session.Appointment.ScheduledAt.ToLocalTime():h:mm tt}." 
                };
            }

            var isDual = session.Patient.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) 
                && session.Doctor.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase);

            if (isDual)
            {
                return new ChatAccessResult { Allowed = false, ErrorMessage = "You cannot start a video call with yourself." };
            }

            if (session.Patient.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = UserRoles.Patient,
                    SenderName = session.Patient.User.FullName
                };
            }

            if (session.Doctor.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = UserRoles.Doctor,
                    SenderName = session.Doctor.User.FullName
                };
            }

            return new ChatAccessResult { Allowed = false, ErrorMessage = "You do not have access to this video call session." };
        }

        public async Task<bool> IsSessionPaidAsync(long sessionId)
        {
            var session = await unitOfWork.ChatSessions.Query()
                .Include(s => s.Appointment)
                    .ThenInclude(a => a != null ? a.Payment : null)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return false;

            // Free sessions (company-paid, AI, or no-appointment) are always accessible
            if (session.IsCompanyPaid || session.IsFreeMessage || session.Appointment == null)
                return true;

            // Online-payment appointments must have a confirmed payment
            if (session.Appointment.PaymentMethod == PaymentMethod.Online)
                return session.Appointment.Payment?.Status == PaymentStatus.Paid;

            // Cash/in-person — no gateway record required
            return true;
        }

        public async Task<bool> IsVideoCallSessionPaidAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .Include(s => s.Appointment)
                    .ThenInclude(a => a != null ? a.Payment : null)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return false;

            if (session.Appointment == null)
                return true;

            if (session.Appointment.PaymentMethod == PaymentMethod.Online)
                return session.Appointment.Payment?.Status == PaymentStatus.Paid;

            return true;
        }

        public async Task<List<ChatMessageDTO>> GetHistory(long sessionId)
        {
            return await unitOfWork.ChatMessages.Query()
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

        public async Task<ChatSessionDetailsDTO?> GetSessionDetails(long sessionId)
        {
            return await unitOfWork.ChatSessions.Query()
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
                    StartedAt = s.StartedAt,
                    DoctorChatPrice = s.Doctor != null ? s.Doctor.ChatPrice : 0m
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<ChatSessionSummaryDTO>> GetUserSessions(string userId, string role)
        {
            var query = unitOfWork.ChatSessions.Query().AsQueryable();
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
                    LastMessage = unitOfWork.ChatMessages.Query()
                        .Where(m => m.SessionId == s.SessionId)
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

        public async Task<ChatMessage> SaveMessage(long sessionId, string role, string content, bool isSystemMessage = false)
        {
            var session = await unitOfWork.ChatSessions.Query().FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (session == null) throw new Exception("Session not found");

            if (DateTime.UtcNow - session.StartedAt > TimeSpan.FromDays(7))
            {
                throw new Exception("Session has expired. Please follow up or start a new session.");
            }

            // Free GP 1-message rule
            if (session.IsCompanyPaid && role == UserRoles.Patient && !isSystemMessage && !content.StartsWith("Clinical Assessment:"))
            {
                var patientMessageCount = await unitOfWork.ChatMessages.Query()
                    .CountAsync(m => m.SessionId == sessionId && m.Role == UserRoles.Patient && !m.Content.StartsWith("Clinical Assessment:"));
                
                if (patientMessageCount == 0)
                {
                    var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.Quota).FirstOrDefaultAsync(p => p.PatientId == session.PatientId);
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

            await unitOfWork.ChatMessages.AddAsync(message);
            await unitOfWork.CompleteAsync();

            return message;
        }

        public async Task<ChatSession> StartOrGetSessionAsync(string patientUserId, long doctorId, bool isCompanyPaid = false)
        {
            var patient = await unitOfWork.PatientProfiles.Query().Include(p => p.Quota).FirstOrDefaultAsync(p => p.UserId == patientUserId);
            if (patient == null)
            {
                throw new Exception("Patient not found.");
            }

            // Verify doctor exists and prevent self-chat
            var doctor = await unitOfWork.DoctorProfiles.Query().Include(d => d.DoctorSpecialties).FirstOrDefaultAsync(d => d.DoctorId == doctorId);
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

            if (isCompanyPaid)
            {
                // SECURITY: Only pure GP doctors (specialty 18 = General Practice, 20 = Family Medicine)
                // are eligible for company-paid free sessions.
                // A doctor who has GP *plus any other specialty* is treated as a specialist
                // and must be booked through the paid appointment system.
                bool isExclusivelyGP = doctor.DoctorSpecialties.Any()
                    && doctor.DoctorSpecialties.All(ds => ds.SpecialtyId == 18 || ds.SpecialtyId == 20);

                if (!isExclusivelyGP)
                {
                    throw new InvalidOperationException("This doctor is not eligible for free GP messages. Please book an appointment through the appointment system.");
                }

                if (patient.Quota == null)
                {
                    patient.Quota = new PatientQuota { PatientId = patient.PatientId };
                    await unitOfWork.PatientQuotas.AddAsync(patient.Quota);
                }

                // reset logic for GP
                if (DateTime.UtcNow.Month != patient.Quota.LastFreeGpMessageReset.Month || DateTime.UtcNow.Year != patient.Quota.LastFreeGpMessageReset.Year)
                {
                    patient.Quota.AvailableFreeGpMessages = 2;
                    patient.Quota.LastFreeGpMessageReset = DateTime.UtcNow;
                }

                if (patient.Quota.AvailableFreeGpMessages <= 0)
                {
                    throw new InvalidOperationException("No free GP messages available for this month.");
                }
            }

            // Check for existing active session first for both paid and unpaid
            var existingSession = await unitOfWork.ChatSessions.Query()
                .FirstOrDefaultAsync(s => s.PatientId == patient.PatientId && s.DoctorId == doctorId && s.IsCompanyPaid == isCompanyPaid && s.Status == SessionStatus.Active && s.StartedAt >= DateTime.UtcNow.AddDays(-1));
            
            if (existingSession != null)
            {
                return existingSession;
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

            await unitOfWork.ChatSessions.AddAsync(newSession);
            await unitOfWork.CompleteAsync();

            return newSession;
        }

        public async Task<ChatSession> StartOrGetAISessionAsync(string patientUserId, long? sessionId = null)
        {
            var patient = await unitOfWork.PatientProfiles.Query().FirstOrDefaultAsync(p => p.UserId == patientUserId);
            if (patient == null)
            {
                throw new Exception("Patient not found.");
            }

            if (sessionId.HasValue)
            {
                var existingSession = await unitOfWork.ChatSessions.Query()
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

            await unitOfWork.ChatSessions.AddAsync(newSession);
            await unitOfWork.CompleteAsync();

            return newSession;
        }

        public async Task<ServiceResult<InitiateFollowUpResponseDTO>> InitiateFollowUpAsync(long sessionId, string patientUserId)
        {
            var session = await unitOfWork.ChatSessions.Query()
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor)
                .Include(s => s.Payment)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.Patient.UserId == patientUserId);

            if (session == null)
                return ServiceResult<InitiateFollowUpResponseDTO>.Failure("Session not found or access denied.");

            if (session.Doctor == null)
                return ServiceResult<InitiateFollowUpResponseDTO>.Failure("Cannot initiate a follow-up on an AI session.");

            if (session.Payment != null && session.Payment.IsFollowUp && session.Payment.Status == PaymentStatus.Pending)
            {
                try
                {
                    var existingUrl = await paymentService.GenerateFollowUpPaymentLinkAsync(
                        session.Payment, session,
                        session.Patient.User.Email ?? "",
                        session.Patient.User.PhoneNumber ?? "",
                        session.Patient.User.FullName);
                    await unitOfWork.CompleteAsync();

                    return ServiceResult<InitiateFollowUpResponseDTO>.Success(new InitiateFollowUpResponseDTO
                    {
                        PaymentUrl = existingUrl,
                        Amount = session.Payment.Amount,
                        SessionId = sessionId
                    });
                }
                catch
                {
                    return ServiceResult<InitiateFollowUpResponseDTO>.Failure("Failed to generate payment link. Please try again.");
                }
            }

            var followUpAmount = (session.Doctor?.ChatPrice ?? 0m) * 0.4m;
            if (followUpAmount <= 0)
                return ServiceResult<InitiateFollowUpResponseDTO>.Failure("Doctor has no chat price set. Cannot initiate follow-up.");

            var payment = new Payment
            {
                AppointmentId = null,
                SessionId = sessionId,
                IsFollowUp = true,
                Amount = followUpAmount,
                Currency = "EGP",
                Status = PaymentStatus.Pending,
                Gateway = PaymentGateway.Geidea
            };

            await unitOfWork.Payments.AddAsync(payment);
            await unitOfWork.CompleteAsync();

            try
            {
                var paymentUrl = await paymentService.GenerateFollowUpPaymentLinkAsync(
                    payment, session,
                    session.Patient.User.Email ?? "",
                    session.Patient.User.PhoneNumber ?? "",
                    session.Patient.User.FullName);

                await unitOfWork.CompleteAsync();

                return ServiceResult<InitiateFollowUpResponseDTO>.Success(new InitiateFollowUpResponseDTO
                {
                    PaymentUrl = paymentUrl,
                    Amount = followUpAmount,
                    SessionId = sessionId
                });
            }
            catch
            {
                unitOfWork.Payments.Remove(payment);
                await unitOfWork.CompleteAsync();
                return ServiceResult<InitiateFollowUpResponseDTO>.Failure("Failed to generate payment link. Please try again.");
            }
        }

        public async Task<bool> IsVideoCallTimePassedAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .Include(s => s.Appointment)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null || session.Appointment == null)
            {
                return false;
            }

            if (session.ActualStartedAt == null)
            {
                return false;
            }

            var now = DateTime.UtcNow;
            var endOfAppointment = session.ActualStartedAt.Value.AddMinutes(30); // Hardcoded to 30 minutes
            return now >= endOfAppointment;
        }

        public async Task RecordVideoCallStartAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session != null && session.ActualStartedAt == null)
            {
                session.ActualStartedAt = DateTime.UtcNow;
                await unitOfWork.CompleteAsync();
            }
        }

        public async Task CompleteVideoCallSessionAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .Include(s => s.Appointment)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session != null)
            {
                session.Status = SessionStatus.Completed;
                session.EndedAt = DateTime.UtcNow;

                if (session.Appointment != null)
                {
                    session.Appointment.Status = AppointmentStatus.Completed;
                }

                await unitOfWork.CompleteAsync();
            }
        }

        public async Task<ServiceResult<string>> GetOrCreateMeetingLinkAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                return ServiceResult<string>.Failure("Video call session not found.");
            }

            if (!string.IsNullOrEmpty(session.MeetingLink))
            {
                return ServiceResult<string>.Success(session.MeetingLink);
            }

            var meetLink = $"https://p2p.mirotalk.com/join?room=TabibiConsultationSession_{sessionId}";
            session.MeetingLink = meetLink;
            await unitOfWork.CompleteAsync();

            return ServiceResult<string>.Success(meetLink);
        }

        public async Task<VideoCallSessionDetailsDTO?> GetVideoCallSessionDetailsAsync(long sessionId)
        {
            var session = await unitOfWork.VideoCallSessions.Query()
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor).ThenInclude(d => d!.User)
                .Include(s => s.Doctor.DoctorSpecialties).ThenInclude(ds => ds.Specialty)
                .Include(s => s.Appointment)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return null;

            var specialtyName = session.Doctor.DoctorSpecialties?.FirstOrDefault()?.Specialty?.Name ?? "General Practice";

            return new VideoCallSessionDetailsDTO
            {
                SessionId = session.SessionId,
                PatientName = session.Patient.User.FullName,
                DoctorName = session.Doctor.User.FullName,
                DoctorSpecialty = specialtyName,
                MeetingLink = session.MeetingLink,
                ScheduledAt = session.Appointment?.ScheduledAt ?? session.StartedAt,
                ActualStartedAt = session.ActualStartedAt,
                Status = session.Status.ToString()
            };
        }
    }
}