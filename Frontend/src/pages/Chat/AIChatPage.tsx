import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AIChat from "../../services/AIChat";
import { getAiQuota, rechargeAiQuota, getAiHistory } from "../../services/AIChat";
import type { AiQuotaResponse } from "../../services/AIChat";
import type Contact from "../../types/Contact";
import type Message from "../../types/Message";
import { ChatInput, MessageBubble } from "../../components/Chat/MainContent";
import ChatService from "../../services/chatService";
import { onUpdateSessionList, offUpdateSessionList } from "../../services/chatHubService";
import type { ReceivedMessage } from "../../types/ReceivedMessage";
import { useAuth } from "../../context/AuthContext";
import { formatTimeTo12Hour } from "../../utils/dateUtils";
import AIChatSidebar from "../../components/Chat/AIChat/AIChatSidebar";
import AIChatHeader from "../../components/Chat/AIChat/AIChatHeader";
import AIChatAssessment from "../../components/Chat/AIChat/AIChatAssessment";
import Swal from "sweetalert2";
import { FiInfo } from "react-icons/fi";

const CURRENT_USER_ID = "user1";

const CONTACTS: Contact[] = [
  {
    id: "c1",
    name: "AI Medical Assistant",
    avatar: "",
    lastMessage: "",
    time: "Now",
    unread: 0,
    online: true,
  },
];

export default function AIChatPage() {
  const [activeContact] = useState<Contact>(CONTACTS[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro-1",
      senderId: "c1",
      text: "Hello! I'm your Tabibi AI assistant. Please describe your symptoms in as much detail as possible, including when they started.",
      timestamp: formatTimeTo12Hour(new Date()),
      context: ""
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024 || !sessionId);
  const [quota, setQuota] = useState<AiQuotaResponse | null>(null);
  const [topicDrift, setTopicDrift] = useState(false);

  const triggerRecharge = () => {
    Swal.fire({
      title: "Recharge AI Messages",
      html: `<div class="text-left font-medium mb-3 text-on-surface-variant text-sm leading-relaxed">
               Select the amount of credits you'd like to purchase:
             </div>
             <div class="mb-4">
               <select id="swal-recharge-amount" class="w-full border border-surface-variant rounded-xl p-3.5 text-sm text-on-surface font-semibold bg-surface-container focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer">
                 <option value="10">10.00 EGP (20 Messages)</option>
                 <option value="20">20.00 EGP (40 Messages)</option>
                 <option value="30">30.00 EGP (60 Messages)</option>
                 <option value="50">50.00 EGP (100 Messages)</option>
                 <option value="100">100.00 EGP (200 Messages)</option>
               </select>
             </div>`,
      showCancelButton: true,
      confirmButtonText: "Recharge via Wallet",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      customClass: {
        popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-surface-variant',
        title: 'text-xl font-bold mb-4 text-on-surface text-left w-full',
        htmlContainer: 'w-full m-0',
        confirmButton: 'w-full mt-4 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg cursor-pointer',
        cancelButton: 'w-full mt-2 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
        actions: 'flex flex-col gap-0 w-full'
      },
      preConfirm: () => {
        const select = document.getElementById('swal-recharge-amount') as HTMLSelectElement;
        return Number(select?.value || 10);
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const amount = result.value;
        rechargeAiQuota(amount).then(res => {
          if (res.paymentUrl) {
            window.location.href = res.paymentUrl;
          }
        }).catch(err => {
          console.error(err);
          Swal.fire({
            title: "Error",
            text: "Failed to initiate recharge. Please try again.",
            icon: "error",
            confirmButtonText: "OK",
            customClass: {
              confirmButton: "bg-primary text-white font-bold py-2.5 px-6 rounded-xl cursor-pointer"
            }
          });
        });
      }
    });
  };
  const [urgencyLevel, setUrgencyLevel] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | null>(null);
  const [recommendedDepts, setRecommendedDepts] = useState<string[]>([]);

  const { user } = useAuth();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericSessionId = sessionId ? Number(sessionId) : undefined;
  const location = useLocation();
  const [initialPromptHandled, setInitialPromptHandled] = useState(false);

  useEffect(() => {
    ChatService.getSessions(user?.activeRole).then(sessions => {
      const aiSessions = sessions.filter((s: any) => s.otherPartyUserId === "AI" || s.otherPartyName === "AI Medical Assistant");
      setRecentSessions(aiSessions);
    }).catch(err => console.error(err));

    const handleUpdateSessionList = (payload: ReceivedMessage) => {
      // Ignore if not AI message
      if (payload.senderRole !== "AI" && payload.senderRole !== "System" && payload.senderName !== "AI Medical Assistant") return;

      setRecentSessions((prev) => {
        const idx = prev.findIndex(s => s.sessionId === payload.sessionId);
        if (idx === -1) {
          ChatService.getSessions(user?.activeRole).then(data => {
            const aiSessions = data.filter((s: any) => s.otherPartyUserId === "AI" || s.otherPartyName === "AI Medical Assistant");
            setRecentSessions(aiSessions);
          }).catch(console.error);
          return prev;
        }
        const updatedSession = { 
          ...prev[idx], 
          lastMessage: payload.content, 
          lastMessageTime: payload.sentAt 
        };
        const newArr = [...prev];
        newArr.splice(idx, 1);
        newArr.unshift(updatedSession);
        return newArr;
      });
    };
    
    onUpdateSessionList(handleUpdateSessionList);

    return () => {
      offUpdateSessionList(handleUpdateSessionList);
    };
  }, [user?.activeRole]);

  const handleFindDoctorClick = (dept?: string) => {
    if (dept) {
      localStorage.setItem("referred_specialty", dept);
    } else {
      localStorage.removeItem("referred_specialty");
    }
    const url = dept ? `/doctors?department=${encodeURIComponent(dept)}` : '/doctors';
    navigate(url);
  };

  const getUrgencyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "emergency": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-outline-variant";
    }
  };

  useEffect(() => {
    getAiQuota().then(res => setQuota(res)).catch(console.error);
    if (numericSessionId && !isNaN(numericSessionId)) {
      getAiHistory(numericSessionId).then(historyData => {
        const history = historyData.messages || [];
        if (history.length > 0) {
          const historyMessages: Message[] = history.map((m, index) => ({
            id: m.messageId.toString(),
            senderId: (m.senderRole as string) === "User" ? CURRENT_USER_ID : "c1",
            text: m.content,
            timestamp: formatTimeTo12Hour(new Date(m.sentAt)),
            context: index === history.length - 1 ? (historyData.clinicalAssessment || "") : ""
          }));
          setMessages(prev => {
            return [prev[0], ...historyMessages];
          });
        }
      }).catch(console.error);
    } else {
      localStorage.removeItem("clinical_assessment");
      localStorage.removeItem("referred_specialty");
      localStorage.removeItem("recommended_departments");
      
      setMessages([
        {
          id: "intro-1",
          senderId: "c1",
          text: "Hello! I'm your Tabibi AI assistant. Please describe your symptoms in as much detail as possible, including when they started.",
          timestamp: formatTimeTo12Hour(new Date()),
          context: ""
        }
      ]);
      setTopicDrift(false);
      setUrgencyLevel(null);
      setClassification(null);
      setRecommendedDepts([]);
    }
  }, [numericSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const trimmedText = text.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      senderId: CURRENT_USER_ID,
      text: trimmedText,
      timestamp: formatTimeTo12Hour(new Date()),
      context: "",
    };

    const lastAiMessage = [...messages]
      .reverse()
      .find((m) => m.senderId === "c1");
    const prevContext = lastAiMessage ? lastAiMessage.context : "";

    const aiMessageId = (Date.now() + 1).toString();
    const placeholderAiMessage: Message = {
      id: aiMessageId,
      senderId: "c1",
      text: "...",
      timestamp: formatTimeTo12Hour(new Date()),
      context: "",
    };

    setMessages((prev) => [...prev, userMessage, placeholderAiMessage]);
    setIsLoading(true);

    try {
      if (quota !== null && quota.freeAiMessages <= 0 && quota.premiumAiMessages <= 0) {
        throw new Error("Quota exceeded");
      }
      const finalResponse = await AIChat(trimmedText, prevContext ?? "", numericSessionId);
      
      if (!numericSessionId && finalResponse.sessionId) {
        navigate(`/ai-chat/${finalResponse.sessionId}`, { replace: true });
      }

      setQuota(prev => {
        if (!prev) return null;
        if (prev.freeAiMessages > 0) return { ...prev, freeAiMessages: prev.freeAiMessages - 1 };
        if (prev.premiumAiMessages > 0) return { ...prev, premiumAiMessages: prev.premiumAiMessages - 1 };
        return prev;
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                text: finalResponse.user_facing_reply,
                context: finalResponse.clinical_assessment || "",
              }
            : msg,
        ),
      );
      setTopicDrift(finalResponse.topic_drift_detected);
      setUrgencyLevel(finalResponse.urgency_level);
      setClassification(finalResponse.classification);
      setRecommendedDepts(finalResponse.recommended_departments || []);
      if (finalResponse.clinical_assessment) {
        localStorage.setItem("clinical_assessment", finalResponse.clinical_assessment);
      }
      if (finalResponse.recommended_departments && finalResponse.recommended_departments.length > 0) {
        localStorage.setItem("recommended_departments", JSON.stringify(finalResponse.recommended_departments));
      }
    } catch (error: any) {
      console.error("Request failed:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      if (error.message === "Quota exceeded" || error.response?.status === 400) {
        triggerRecharge();
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: "Error: Could not reach the server." }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ((location.state?.initialPrompt || location.state?.attachedFile) && !initialPromptHandled && !isLoading) {
      setInitialPromptHandled(true);
      const promptText = location.state.initialPrompt || "";
      const attachedFile = location.state.attachedFile;
      
      if (attachedFile) {
        setIsLoading(true);
        ChatService.uploadFile(attachedFile, () => {}).then(fileUrl => {
          setIsLoading(false);
          let fullMessage = promptText;
          if (fullMessage.trim()) {
            fullMessage += `\n${fileUrl}`;
          } else {
            fullMessage = fileUrl;
          }
          handleSendMessage(fullMessage);
        }).catch(err => {
          console.error("Failed to upload attached file", err);
          setIsLoading(false);
          if (promptText.trim()) handleSendMessage(promptText);
        });
      } else if (promptText.trim()) {
        handleSendMessage(promptText);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, initialPromptHandled, isLoading]);

  const nowLabel = formatTimeTo12Hour(new Date());
  const todayLabel = new Date().toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="flex-1 flex overflow-hidden max-w-[1440px] mx-auto w-full h-[calc(100dvh-64px)] lg:h-dvh bg-surface-bright">
      <AIChatSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        numericSessionId={numericSessionId}
        recentSessions={recentSessions}
      />

      <section className={`flex-1 flex flex-col bg-surface-bright relative min-w-0 ${((!numericSessionId && recentSessions.length > 0) || isSidebarOpen) ? 'hidden md:flex' : 'flex'}`}>
        <AIChatHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeContact={activeContact}
          quota={quota}
          navigate={navigate as any}
          onRechargeClick={triggerRecharge}
        />

        <div className="bg-primary-light/10 border-b border-primary-light/20 px-4 py-2 flex justify-center items-center shrink-0 z-10">
          <p className="text-[13px] font-medium text-on-surface-variant text-center flex items-center gap-1.5">
            <FiInfo className="text-[14px] shrink-0 text-primary" />
            Keep it brief to maximize usage. For urgent matters, seek immediate human consultation.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-surface-bright">
          <div className="flex justify-center">
            <span className="bg-surface-variant text-on-surface-variant text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {todayLabel}, {nowLabel}
            </span>
          </div>

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.senderId === CURRENT_USER_ID}
            />
          ))}

          <AIChatAssessment 
            topicDrift={topicDrift}
            urgencyLevel={urgencyLevel}
            classification={classification}
            recommendedDepts={recommendedDepts}
            handleFindDoctorClick={handleFindDoctorClick}
            getUrgencyColor={getUrgencyColor}
          />

          <div ref={messagesEndRef} className="h-2 sm:h-4" />
        </div>

        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          acceptedFileTypes=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf"
          onFileUpload={async (file, onProgress) => {
            return await ChatService.uploadFile(file, (e: any) => {
              if (e.total) onProgress(Math.round((e.loaded * 100) / e.total));
            });
          }}
        />
      </section>
    </main>
  );
}
