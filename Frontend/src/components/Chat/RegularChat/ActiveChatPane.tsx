import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useChatSession } from "../../../hooks/useChatSession";
import { MessageBubble, ChatInput } from "../MainContent";
import type Message from "../../../types/Message";
import type Contact from "../../../types/Contact";
import { formatTimeTo12Hour } from "../../../utils/dateUtils";
import Skeleton from "../../common/Skeleton";
import NetworkError from "../../common/NetworkError";
import ChatService from "../../../services/chatService";
import Swal from "sweetalert2";
import { CachedImage } from "../../common/CachedImage";
import { getFileUrl } from "../../../utils/fileUtils";
import { TbArrowLeft, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import type { SessionInfo } from "../../../types/chat";
import { MdPayment, MdOutlineHourglassDisabled } from "react-icons/md";

interface ActiveChatPaneProps {
  numericSessionId: number;
  navigate: (path: string) => void;
  onBack: () => void;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  isDoctor: boolean;
  sessions: SessionInfo[];
}

export default function ActiveChatPane({ 
  numericSessionId, 
  navigate,
  onBack,
  isSidebarOpen,
  onOpenSidebar,
  isDoctor,
  sessions
}: ActiveChatPaneProps) {
  const { user } = useAuth();
  const { messages, loading, error, send, sessionDetails, isOtherUserOnline } = useChatSession(numericSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  const [assessmentVisible, setAssessmentVisible] = useState(true);
  const currentUserId = user?.id;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const displayMessages: Message[] = useMemo(
    () =>
      messages.map((m) => ({
        id: String(m.messageId),
        senderId: m.senderUserId || m.senderRole || "",
        text: m.content,
        timestamp: formatTimeTo12Hour(new Date(m.sentAt)),
      })),
    [messages]
  );

  const contact: Contact = useMemo(() => {
    let name = "Contact";
    if (isDoctor) {
      name = sessionDetails?.patientName || "Patient";
    } else {
      name = sessionDetails?.doctorName || "Doctor";
      if (!name.startsWith("Dr.") && name !== "AI Medical Assistant") {
        name = `Dr. ${name}`;
      }
    }
    const session = sessions.find(s => s.sessionId === numericSessionId);
    return {
      id: numericSessionId.toString(),
      name,
      avatar: session?.otherPartyProfilePictureUrl || "",
      lastMessage: "",
      time: "",
      unread: 0,
      online: isOtherUserOnline,
      specialty: sessionDetails?.doctorSpecialty || "",
      doctorId: sessionDetails?.doctorId
    };
  }, [numericSessionId, sessionDetails, isOtherUserOnline, isDoctor, sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const showAssessmentButton = useMemo(() => {
    if (isDoctor) return false;
    if (!assessmentVisible) return false;
    const clinicalAssessment = localStorage.getItem("clinical_assessment");
    return !!clinicalAssessment && contact.name !== "AI Medical Assistant";
  }, [assessmentVisible, isDoctor, contact.name]);

  const handleSendAssessment = () => {
    const assessment = localStorage.getItem("clinical_assessment");
    if (!assessment) return;
    Swal.fire({
      title: "AI Clinic Assessment",
      html: `<div class="text-left bg-surface-container p-4 rounded-xl border border-surface-variant text-sm whitespace-pre-wrap max-h-60 overflow-y-auto text-on-surface font-medium">${assessment}</div>`,
      showCancelButton: true,
      confirmButtonText: "Send to Doctor",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      customClass: {
        popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-surface-variant',
        title: 'text-2xl font-bold mb-4 text-primary-dark text-left w-full',
        htmlContainer: 'w-full m-0',
        confirmButton: 'w-full mt-6 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
        cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors',
        actions: 'flex flex-col gap-0 w-full mt-2'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        await send(`Clinical Assessment:\n${assessment}`);
        localStorage.removeItem("clinical_assessment"); 
        setAssessmentVisible(false);
      }
    });
  };

  if (loading) return <div className="flex-1 p-8"><Skeleton className="h-full min-h-[400px] w-full" /></div>;
  if (error) return <div className="flex-1 flex items-center justify-center"><NetworkError message={error} /></div>;

  return (
    <>
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-surface-variant flex items-center gap-3 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={onBack} className="md:hidden text-on-surface-variant p-1 -ml-2 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer">
          <TbArrowLeft className="text-2xl" />
        </button>
        {!isSidebarOpen && (
          <button
            className="cursor-pointer p-2 -ml-2 mr-1 text-on-surface-variant hover:text-primary-dark hover:bg-surface-container-high rounded-lg transition-colors"
            onClick={onOpenSidebar}
          >
            <TbLayoutSidebarRightCollapse className="text-[24px]" />
          </button>
        )}
        <div className="flex items-center gap-3">
          {contact.avatar ? (
            <div className="w-11 h-11 rounded-full overflow-hidden shadow-md border-2 border-white">
              <CachedImage
                src={getFileUrl(contact.avatar)}
                alt={contact.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-light to-primary text-white flex items-center justify-center font-bold shadow-md text-lg border-2 border-white">
               {contact.name.replace("Dr. ", "").charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-extrabold text-on-surface leading-tight text-[17px]">
              {!isDoctor && contact.doctorId && contact.name !== "AI Medical Assistant" ? (
                <span 
                  onClick={() => navigate(`/doctors/${contact.doctorId}`)} 
                  className="hover:underline hover:text-primary cursor-pointer"
                  title="View Profile"
                >
                  {contact.name}
                </span>
              ) : (
                contact.name
              )}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${contact.online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-outline-variant"}`}></span>
              <span className="text-[12px] font-semibold text-outline">
                {contact.online ? "Online" : "Offline"}
              </span>
              {!isDoctor && contact.specialty && (
                <>
                  <span className="text-surface-variant">|</span>
                  <span className="text-[12px] font-semibold text-primary">{contact.specialty}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-surface-bright">
        {!isDoctor && sessionDetails?.isCompanyPaid && (
          <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded-lg text-sm mb-2 text-center">
            You can only send exactly one message. Make sure to describe your issue completely.
          </div>
        )}

        {sessionDetails && new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000 && (
          <div className="bg-surface-container-low border border-surface-variant p-6 rounded-2xl text-center shadow-md max-w-md mx-auto my-4 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-sm">
              <MdOutlineHourglassDisabled className="text-2xl" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-on-surface">Consultation Expired</h4>
              <p className="text-xs font-medium text-on-surface-variant mt-1 leading-relaxed">
                This 24-hour consultation session has expired. {isDoctor ? "The patient must initiate a follow-up to resume." : "You can resume this session by paying a follow-up fee."}
              </p>
            </div>
            {!isDoctor && (
              <button 
                onClick={() => {
                  const basePrice = sessionDetails?.doctorChatPrice || 0;
                  const followUpPrice = basePrice * 0.4;
                  
                  Swal.fire({
                    title: "Confirm Follow-Up Payment",
                    html: `<div class="text-center">
                             <p class="text-sm font-medium text-on-surface-variant leading-relaxed">
                               This session has expired. You can resume it with a follow-up consultation fee of:
                             </p>
                             <p class="text-3xl font-extrabold text-primary mt-3 mb-1">
                               EGP ${followUpPrice.toFixed(2)}
                             </p>
                             <p class="text-xs font-semibold text-text-muted">
                               (40% of standard doctor fee EGP ${basePrice.toFixed(2)})
                             </p>
                           </div>`,
                    showCancelButton: true,
                    confirmButtonText: "Confirm and Pay",
                    cancelButtonText: "Cancel",
                    buttonsStyling: false,
                    customClass: {
                      popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-surface-variant',
                      title: 'text-xl font-bold mb-4 text-on-surface text-center w-full',
                      htmlContainer: 'w-full m-0',
                      confirmButton: 'w-full mt-6 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg cursor-pointer',
                      cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
                      actions: 'flex flex-col gap-0 w-full mt-2'
                    }
                  }).then(async (result) => {
                    if (result.isConfirmed) {
                      try {
                        const res = await ChatService.followUp(numericSessionId);
                        if (res.paymentUrl) {
                          window.location.href = res.paymentUrl;
                        } else {
                          window.location.reload();
                        }
                      } catch (e: any) {
                        Swal.fire({
                          title: "Error",
                          text: e.response?.data || "Failed to initiate follow up.",
                          icon: "error",
                          confirmButtonText: "OK",
                          customClass: {
                            confirmButton: "bg-primary text-white font-bold py-2.5 px-6 rounded-xl cursor-pointer"
                          }
                        });
                      }
                    }
                  });
                }}
                className="mt-1 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <MdPayment className="text-lg" />
                <span>Pay 40% Follow-Up Fee to Resume</span>
              </button>
            )}
          </div>
        )}
        
        {sessionDetails?.isFollowUp && (
          <div className="bg-[#e5efff] border border-[#b8d4ff] text-[#0055ff] p-2 rounded-lg text-xs mb-2 text-center font-bold tracking-wide uppercase">
            Follow-Up Session
          </div>
        )}

        {displayMessages.length === 0 ? (
          <p className="text-sm text-outline text-center mt-8 font-medium">
            No messages yet.
          </p>
        ) : (
          displayMessages.map((msg) => {
            const isMine = msg.senderId === currentUserId || msg.senderId === user?.id;
            return <MessageBubble key={msg.id} msg={msg} isMe={isMine} />;
          })
        )}
        <div ref={messagesEndRef} className="h-2 sm:h-4" />
      </div>

      {showAssessmentButton && (
        <div className="bg-surface-container border-t border-surface-variant p-3 flex justify-center items-center shrink-0">
          <button 
            onClick={handleSendAssessment}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            Send Latest AI Assessment
          </button>
        </div>
      )}

      <ChatInput 
        onSendMessage={send} 
        isLoading={false} 
        acceptedFileTypes=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.avi,.webm,.wmv,.mpeg,.mpg,.flv,.3gpp,.pdf"
        disabled={sessionDetails ? (
          (new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000) || 
          (!isDoctor && sessionDetails.isCompanyPaid && displayMessages.filter(m => m.senderId === currentUserId && !m.text.startsWith("Clinical Assessment:")).length >= 1)
        ) : false} 
        onFileUpload={async (file, onProgress) => {
          return await ChatService.uploadFile(file, (e: any) => {
            if (e.total) onProgress(Math.round((e.loaded * 100) / e.total));
          });
        }}
      />
    </>
  );
}
