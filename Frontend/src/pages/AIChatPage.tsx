import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AIChat from "../services/AIChat";
import { FiInfo } from "react-icons/fi";
import { getAiQuota, rechargeAiQuota, getAiHistory } from "../services/AIChat";
import type { AiQuotaResponse } from "../services/AIChat";
import type Contact from "../types/Contact";
import type Message from "../types/Message";
import { ChatInput, MessageBubble } from "../components/Chat/MainContent";
import ChatService from "../services/chatService";
import { onUpdateSessionList, offUpdateSessionList } from "../services/chatHubService";
import type { ReceivedMessage } from "../types/ReceivedMessage";
import { useAuth } from "../context/AuthContext";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse, TbArrowLeft } from "react-icons/tb";
import { HiSparkles } from "react-icons/hi";
import { MdOutlineAccountBalanceWallet } from "react-icons/md";
import { formatTimeTo12Hour } from "../utils/dateUtils";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [quota, setQuota] = useState<AiQuotaResponse | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(10);
  const [topicDrift, setTopicDrift] = useState(false);
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
      default: return "bg-gray-400";
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
        setShowRecharge(true);
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
    if (location.state?.initialPrompt && !initialPromptHandled && !isLoading) {
      setInitialPromptHandled(true);
      const promptText = location.state.initialPrompt;
      const attachedFile = location.state.attachedFile;
      let fullMessage = promptText;
      if (attachedFile) {
        fullMessage += `\n[Attached File: ${attachedFile.name}]`;
      }
      handleSendMessage(fullMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, initialPromptHandled, isLoading]);

  const nowLabel = formatTimeTo12Hour(new Date());
  const todayLabel = new Date().toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="flex-1 flex overflow-hidden max-w-[1440px] mx-auto w-full h-[calc(100dvh-64px)] lg:h-dvh bg-[#fcf8ff]">
      <aside className={`
        flex flex-col bg-white border-r border-[#e5deff] transition-all duration-300 ease-in-out shrink-0
        ${isSidebarOpen 
          ? `w-full md:w-[350px] lg:w-[400px] translate-x-0 ${numericSessionId ? 'hidden md:flex' : 'flex'}`
          : `w-0 overflow-hidden border-none -translate-x-full md:translate-x-0 hidden md:flex`
        }
      `}>
        <div className="p-4 border-b border-[#e5deff] w-full md:w-[350px] lg:w-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#1a1345] flex items-center gap-2">
              <HiSparkles className="text-[#6a5acd]" /> AI Chat
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="cursor-pointer p-2 -mr-2 text-[#474553] hover:bg-[#eae5ff] hover:text-[#5140b3] rounded-lg transition-colors hidden md:block"
            >
              <TbLayoutSidebarLeftCollapse className="text-[20px]" />
            </button>
          </div>
          <button
            className="w-full bg-gradient-to-r from-[#8a7cf0] to-[#6a5acd] text-[#ffffff] rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-90 transition-opacity shadow-md cursor-pointer mb-2"
            onClick={() => navigate("/ai-chat")}
          >
            <HiSparkles className="text-[18px]" />
            New AI Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {recentSessions.length === 0 ? (
             <p className="text-center text-[#787584] text-sm mt-6">No recent consultations.</p>
          ) : (
             recentSessions.map(session => (
                <div 
                  key={session.sessionId}
                  onClick={() => navigate(`/ai-chat/${session.sessionId}`)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${numericSessionId === session.sessionId ? 'bg-[#f0ebff] border-[#b8a7ff]' : 'bg-white border-[#f0ebff] hover:border-[#b8a7ff] hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <span className="font-bold text-[#1a1345] text-sm break-words whitespace-normal flex items-start gap-2">
                      <HiSparkles className="text-[#6a5acd] mt-1 flex-shrink-0" /> {session.otherPartyName}
                    </span>
                    <span className="text-xs font-medium text-[#787584] shrink-0">
                      {session.lastMessageTime ? new Date(session.lastMessageTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#474553] line-clamp-2">{session.lastMessage || "No messages"}</p>
                </div>
             ))
          )}
        </div>
      </aside>

      <section className={`flex-1 flex flex-col bg-[#fcf8ff] relative min-w-0 ${!numericSessionId && recentSessions.length > 0 && false ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white px-4 sm:px-6 py-4 border-b border-[#e5deff] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button onClick={() => navigate(-1)} className="md:hidden text-[#474553] p-1 -ml-2 rounded-lg hover:bg-[#eae5ff] transition-colors">
               <TbArrowLeft className="text-2xl" />
            </button>
            {!isSidebarOpen && (
              <button
                className="hidden md:block cursor-pointer p-2 -ml-2 mr-1 text-[#474553] hover:text-[#5140b3] hover:bg-[#eae5ff] rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <TbLayoutSidebarRightCollapse className="text-[24px]" />
              </button>
            )}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8a7cf0] to-[#6a5acd] text-white flex items-center justify-center font-bold shadow-md text-lg border-2 border-white shrink-0">
              <HiSparkles className="text-[20px]" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#1a1345] leading-tight text-[17px]">{activeContact.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-[12px] font-semibold text-[#787584]">Online</span>
              </div>
            </div>
          </div>

          {quota && (
            <div className="flex items-center justify-between sm:justify-end gap-3 bg-[#f8f7ff] border border-[#e5deff] px-3 py-2 rounded-xl shadow-sm w-full lg:w-auto mt-2 lg:mt-0">
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <MdOutlineAccountBalanceWallet className="text-[18px] text-[#474553]" />
                <p className="text-xs font-semibold text-[#474553]">Usage</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 sm:flex-none sm:w-32">
                <div className="flex justify-between text-[10px] font-bold text-[#1a1345] uppercase tracking-wide">
                  <span>Free Daily</span>
                  <span>{quota.freeAiMessages}/15</span>
                </div>
                <div className="h-1.5 w-full bg-[#eae5ff] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6a5acd] rounded-full transition-all duration-300"
                    style={{ width: `${(quota.freeAiMessages / 15) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-[#e5deff] ml-2">
                <span className="text-[10px] font-bold text-[#1a1345] uppercase tracking-wide mr-2">
                  Premium
                </span>
                <span className="text-[14px] font-extrabold text-[#6a5acd]">
                  {quota.premiumAiMessages}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#b8a7ff]/10 border-b border-[#b8a7ff]/20 px-4 py-2 flex justify-center items-center shrink-0 z-10">
          <p className="text-[13px] font-medium text-[#474553] text-center flex items-center gap-1.5">
            <FiInfo className="text-[14px] shrink-0 text-[#6a5acd]" />
            Keep it brief to maximize usage. For urgent matters, seek immediate human consultation.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-[#fcf8ff]">
          <div className="flex justify-center">
            <span className="bg-[#e5deff] text-[#474553] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
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

          {topicDrift && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl text-sm text-center shadow-sm max-w-[80%] mx-auto font-medium">
              Please stick to describing your medical symptoms so we can assist you effectively.
            </div>
          )}

          {urgencyLevel && (
            <div className="flex flex-col items-center gap-3 mt-4 border-t border-[#e5deff] pt-6 max-w-[90%] mx-auto w-full">
              {classification && (
                <div className="flex items-center gap-2 mb-1 bg-white px-3 py-1.5 rounded-lg border border-[#e5deff] shadow-sm">
                  <span className="text-sm font-bold text-[#1a1345]">Classification:</span>
                  <span className="text-[#6a5acd] text-[13px] font-semibold capitalize">
                    {classification.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#e5deff] shadow-sm">
                <span className="text-sm font-bold text-[#1a1345]">Assessment Urgency:</span>
                <div className={`w-2.5 h-2.5 rounded-full ${getUrgencyColor(urgencyLevel)} shadow-sm`} />
                <span className="text-[13px] font-semibold text-[#474553] capitalize">{urgencyLevel}</span>
              </div>
              
              {urgencyLevel.toLowerCase() === "low" && (
                <p className="text-sm text-[#474553] font-medium mt-1">We suggest consulting a General Practice doctor for this matter.</p>
              )}

              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {recommendedDepts.length > 0 ? (
                  recommendedDepts.map(dept => (
                    <button 
                      key={dept} 
                      onClick={() => handleFindDoctorClick(dept)}
                      className="px-5 py-2.5 bg-[#6a5acd] text-white rounded-xl text-sm font-bold hover:bg-[#5b4eb8] transition-colors shadow-sm"
                    >
                      Find {dept} Doctor
                    </button>
                  ))
                ) : (
                  <button 
                    onClick={() => handleFindDoctorClick()}
                    className="px-5 py-2.5 bg-[#6a5acd] text-white rounded-xl text-sm font-bold hover:bg-[#5b4eb8] transition-colors shadow-sm"
                  >
                    Find Doctors
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2 sm:h-4" />
        </div>

        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          acceptedFileTypes=".jpg,.jpeg,.png,.pdf"
          onFileUpload={(file) => alert(`Selected ${file.name} for AI analysis.`)}
        />
      </section>

      {showRecharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1345]/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-[#e5deff]">
            <h3 className="text-xl font-bold mb-3 text-[#1a1345]">Recharge AI Messages</h3>
            <p className="mb-5 text-sm text-[#474553] font-medium leading-relaxed">You have run out of AI messages. Recharge now for 10.00 EGP per 20 messages.</p>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2 text-[#1a1345]">Amount (EGP)</label>
              <select 
                className="w-full border border-[#e5deff] rounded-xl p-3 text-sm text-[#1a1345] font-medium focus:outline-none focus:border-[#6a5acd] focus:ring-1 focus:ring-[#6a5acd] transition-colors bg-[#f8f7ff]"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value))}
              >
                <option value={10}>10.00 EGP (20 Messages)</option>
                <option value={20}>20.00 EGP (40 Messages)</option>
                <option value={30}>30.00 EGP (60 Messages)</option>
                <option value={50}>50.00 EGP (100 Messages)</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowRecharge(false)}
                className="px-5 py-2.5 text-sm font-bold text-[#474553] hover:bg-[#f0ebff] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    await rechargeAiQuota(rechargeAmount);
                    const quotaData = await getAiQuota();
                    setQuota(quotaData);
                    setShowRecharge(false);
                  } catch (e) {
                    console.error("Failed to recharge", e);
                  }
                }}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#6a5acd] rounded-xl hover:bg-[#5b4eb8] transition-colors shadow-md"
              >
                Pay {rechargeAmount.toFixed(2)} EGP
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
