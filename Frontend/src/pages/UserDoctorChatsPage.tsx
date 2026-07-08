import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatService from "../services/chatService";
import { useChatSession } from "../hooks/useChatSession";
import { MessageBubble, ChatInput } from "../components/Chat/MainContent";
import type Message from "../types/Message";
import type Contact from "../types/Contact";
import { onUpdateSessionList, offUpdateSessionList } from "../services/chatHubService";
import type { ReceivedMessage } from "../types/ReceivedMessage";
import { FaUserMd, FaUsers, FaRegClock, FaChevronRight } from "react-icons/fa";
import { TbArrowLeft, TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import Swal from "sweetalert2";
import { formatTimeTo12Hour } from "../utils/dateUtils";

interface SessionInfo {
  sessionId: number;
  otherPartyName: string;
  otherPartyUserId: string;
  otherPartySpecialty: string;
  lastMessage: string;
  lastMessageTime: string | null;
}

interface GroupedDoctor {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  latestMessageTime: number;
  sessions: SessionInfo[];
}

export default function UserDoctorChatsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"doctors" | "recent">("recent");
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const numericSessionId = sessionId ? Number(sessionId) : undefined;
  
  useEffect(() => {
    ChatService.getSessions(user?.activeRole).then(data => {
      // Filter out AI sessions
      const doctorSessions = data.filter((s: any) => s.otherPartyUserId !== "AI" && s.otherPartyName !== "AI Medical Assistant");
      setSessions(doctorSessions);
    }).catch(err => console.error(err));

    const handleUpdateSessionList = (payload: ReceivedMessage) => {
      // Ignore AI messages here
      if (payload.senderRole === "AI" || (payload as any).senderId === "AI" || payload.senderRole === "System") return;

      setSessions((prev) => {
        const idx = prev.findIndex(s => s.sessionId === payload.sessionId);
        if (idx === -1) {
          ChatService.getSessions(user?.activeRole).then(data => {
            const doctorSessions = data.filter((s: any) => s.otherPartyUserId !== "AI" && s.otherPartyName !== "AI Medical Assistant");
            setSessions(doctorSessions);
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
    return () => offUpdateSessionList(handleUpdateSessionList);
  }, [user?.activeRole]);

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [sessions]);

  const groupedDoctors = useMemo(() => {
    const map = new Map<string, GroupedDoctor>();
    sessions.forEach(s => {
      if (!map.has(s.otherPartyUserId)) {
        map.set(s.otherPartyUserId, {
          doctorId: s.otherPartyUserId,
          doctorName: s.otherPartyName.startsWith("Dr.") ? s.otherPartyName : `Dr. ${s.otherPartyName}`,
          doctorSpecialty: s.otherPartySpecialty,
          latestMessageTime: s.lastMessageTime ? new Date(s.lastMessageTime).getTime() : 0,
          sessions: []
        });
      }
      const group = map.get(s.otherPartyUserId)!;
      group.sessions.push(s);
      const sTime = s.lastMessageTime ? new Date(s.lastMessageTime).getTime() : 0;
      if (sTime > group.latestMessageTime) {
        group.latestMessageTime = sTime;
      }
    });

    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.sessions.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
    });

    return groups.sort((a, b) => b.latestMessageTime - a.latestMessageTime);
  }, [sessions]);


  useEffect(() => {
    if (numericSessionId && sessions.length > 0) {
      const session = sessions.find(s => s.sessionId === numericSessionId);
      if (session) {
        setExpandedDoctorId(session.otherPartyUserId);
      }
    }
  }, [numericSessionId, sessions]);


  return (
    <main className="flex-1 flex overflow-hidden max-w-[1440px] mx-auto w-full h-[calc(100dvh-64px)] lg:h-dvh bg-[#fcf8ff]">
      
      {/* Left Sidebar */}
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
              <FaUserMd className="text-[#6a5acd]" /> Doctor Chats
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="cursor-pointer p-2 -mr-2 text-[#474553] hover:bg-[#eae5ff] hover:text-[#5140b3] rounded-lg transition-colors hidden md:block"
            >
              <TbLayoutSidebarLeftCollapse className="text-[20px]" />
            </button>
          </div>
          <div className="flex bg-[#f8f7ff] rounded-lg p-1 gap-1 border border-[#e5deff]">
            <button 
              onClick={() => setActiveTab("doctors")}
              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === "doctors" ? 'bg-white text-[#6a5acd] shadow-sm border border-[#e5deff]' : 'text-[#787584] hover:text-[#1a1345]'}`}
            >
              <FaUsers /> By Doctor
            </button>
            <button 
              onClick={() => setActiveTab("recent")}
              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === "recent" ? 'bg-white text-[#6a5acd] shadow-sm border border-[#e5deff]' : 'text-[#787584] hover:text-[#1a1345]'}`}
            >
              <FaRegClock /> Recent
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === "recent" && (
            recentSessions.length === 0 ? (
              <p className="text-center text-[#787584] text-sm mt-6">No recent messages.</p>
            ) : (
              recentSessions.map(session => (
                <div 
                  key={session.sessionId}
                  onClick={() => navigate(`/doctor-chats/${session.sessionId}`)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${numericSessionId === session.sessionId ? 'bg-[#f0ebff] border-[#b8a7ff]' : 'bg-white border-[#f0ebff] hover:border-[#b8a7ff] hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <span className="font-bold text-[#1a1345] text-sm break-words whitespace-normal">
                      {session.otherPartyName.startsWith("Dr.") ? session.otherPartyName : `Dr. ${session.otherPartyName}`}
                    </span>
                    <span className="text-xs font-medium text-[#787584] shrink-0">
                      {session.lastMessageTime ? new Date(session.lastMessageTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#474553] line-clamp-2">{session.lastMessage || "No messages"}</p>
                </div>
              ))
            )
          )}

          {activeTab === "doctors" && (
            groupedDoctors.length === 0 ? (
              <p className="text-center text-[#787584] text-sm mt-6">No doctor chats found.</p>
            ) : (
              groupedDoctors.map(doc => (
                <div key={doc.doctorId} className={`bg-white rounded-xl transition-all border ${expandedDoctorId === doc.doctorId ? 'border-[#b8a7ff] shadow-sm mb-3' : 'border-[#f0ebff] mb-2 hover:border-[#b8a7ff]'}`}>
                  <button 
                    onClick={() => setExpandedDoctorId(expandedDoctorId === doc.doctorId ? null : doc.doctorId)}
                    className="w-full p-4 flex justify-between items-center bg-transparent transition-colors rounded-xl"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-[#1a1345] text-[15px] break-words whitespace-normal">{doc.doctorName}</span>
                      {doc.doctorSpecialty && (
                        <span className="text-[12px] font-medium text-[#787584] mt-0.5">{doc.doctorSpecialty}</span>
                      )}
                      <span className="text-[13px] font-medium text-[#6a5acd] mt-1">{doc.sessions.length} Session{doc.sessions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <FaChevronRight className={`text-[#474553] text-sm transition-transform ${expandedDoctorId === doc.doctorId ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {expandedDoctorId === doc.doctorId && (
                    <div className="bg-[#f8f7ff] p-3 border-t border-[#e5deff] space-y-2 rounded-b-xl">
                      {doc.sessions.map((session, idx) => (
                        <div 
                          key={session.sessionId}
                          onClick={() => navigate(`/doctor-chats/${session.sessionId}`)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${numericSessionId === session.sessionId ? 'bg-white border-[#6a5acd] shadow-sm' : 'bg-white border-[#e5deff] hover:border-[#b8a7ff]'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-sm font-bold ${numericSessionId === session.sessionId ? 'text-[#6a5acd]' : 'text-[#1a1345]'}`}>Session {doc.sessions.length - idx}</span>
                            <span className="text-[11px] font-semibold text-[#787584] bg-[#eae5ff] px-2 py-0.5 rounded-full">
                              {session.lastMessageTime ? new Date(session.lastMessageTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'New'}
                            </span>
                          </div>
                          <p className="text-xs text-[#474553] line-clamp-1 font-medium">{session.lastMessage || "No messages"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </aside>

      {/* Right Chat Pane */}
      <section className={`flex-1 flex flex-col bg-[#fcf8ff] relative min-w-0 ${!numericSessionId ? 'hidden md:flex' : 'flex'}`}>
        {numericSessionId ? (
          <ActiveChatPane 
            numericSessionId={numericSessionId} 
            onBack={() => navigate('/doctor-chats')} 
            isSidebarOpen={isSidebarOpen}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
             {!isSidebarOpen && (
               <button
                 className="absolute top-4 left-4 cursor-pointer p-2 text-[#474553] hover:text-[#5140b3] hover:bg-[#eae5ff] rounded-lg transition-colors hidden md:block"
                 onClick={() => setIsSidebarOpen(true)}
               >
                 <TbLayoutSidebarRightCollapse className="text-[24px]" />
               </button>
             )}
             <div className="w-24 h-24 bg-[#f0ebff] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#e5deff]">
               <FaUserMd className="text-4xl text-[#6a5acd]" />
             </div>
             <h3 className="text-2xl font-extrabold text-[#1a1345] mb-2 tracking-tight">Doctor Chats</h3>
             <p className="text-[#474553] max-w-md font-medium text-sm leading-relaxed">Select a doctor or a recent consultation session from the sidebar to view the conversation and reply.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function ActiveChatPane({ 
  numericSessionId, 
  onBack,
  isSidebarOpen,
  onOpenSidebar
}: { 
  numericSessionId: number;
  onBack: () => void;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
}) {
  const { messages, loading, error, send, sessionDetails, isOtherUserOnline } = useChatSession(numericSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => Date.now(), []);

  const [assessmentVisible, setAssessmentVisible] = useState(true);

  const displayMessages: Message[] = useMemo(
    () =>
      messages.map((m) => ({
        id: String(m.messageId),
        senderId: m.senderRole,
        text: m.content,
        timestamp: formatTimeTo12Hour(new Date(m.sentAt)),
      })),
    [messages]
  );

  const contact: Contact = useMemo(() => ({
    id: numericSessionId.toString(),
    name: sessionDetails?.doctorName?.startsWith("Dr.") ? sessionDetails.doctorName : `Dr. ${sessionDetails?.doctorName || "Doctor"}`,
    avatar: "",
    lastMessage: "",
    time: "",
    unread: 0,
    online: isOtherUserOnline,
    specialty: sessionDetails?.doctorSpecialty || ""
  }), [numericSessionId, sessionDetails, isOtherUserOnline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const showAssessmentButton = useMemo(() => {
    if (!assessmentVisible) return false;
    const clinicalAssessment = localStorage.getItem("clinical_assessment");
    return !!clinicalAssessment;
  }, [assessmentVisible]);

  const handleSendAssessment = () => {
    const assessment = localStorage.getItem("clinical_assessment");
    if (!assessment) return;
    Swal.fire({
      title: "AI Clinic Assessment",
      html: `<div class="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto text-gray-700 font-medium">${assessment}</div>`,
      showCancelButton: true,
      confirmButtonText: "Send to Doctor",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      customClass: {
        popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100',
        title: 'text-2xl font-bold mb-4 text-gray-800 text-left w-full',
        htmlContainer: 'w-full m-0',
        confirmButton: 'w-full mt-6 bg-[#6a5acd] hover:bg-[#5b4eb8] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
        cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors',
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

  if (loading) return <div className="flex-1 flex items-center justify-center text-[#787584] font-medium">Loading conversation...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-red-500 font-medium">Error: {error}</div>;

  return (
    <>
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-[#e5deff] flex items-center gap-3 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={onBack} className="md:hidden text-[#474553] p-1 -ml-2 rounded-lg hover:bg-[#eae5ff] transition-colors">
          <TbArrowLeft className="text-2xl" />
        </button>
        {!isSidebarOpen && (
          <button
            className="hidden md:block cursor-pointer p-2 -ml-2 mr-1 text-[#474553] hover:text-[#5140b3] hover:bg-[#eae5ff] rounded-lg transition-colors"
            onClick={onOpenSidebar}
          >
            <TbLayoutSidebarRightCollapse className="text-[24px]" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8a7cf0] to-[#6a5acd] text-white flex items-center justify-center font-bold shadow-md text-lg border-2 border-white">
             {contact.name.replace("Dr. ", "").charAt(0)}
          </div>
          <div>
            <h2 className="font-extrabold text-[#1a1345] leading-tight text-[17px]">{contact.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${contact.online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}></span>
              <span className="text-[12px] font-semibold text-[#787584]">
                {contact.online ? "Online" : "Offline"}
              </span>
              {contact.specialty && (
                <>
                  <span className="text-[#e5deff]">|</span>
                  <span className="text-[12px] font-semibold text-[#6a5acd]">{contact.specialty}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-[#fcf8ff]">
        {sessionDetails?.isCompanyPaid && (
          <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded-lg text-sm mb-2 text-center">
            You can only send exactly one message. Make sure to describe your issue completely.
          </div>
        )}

        {sessionDetails && new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-2 text-center shadow-sm">
            <strong className="block mb-1 text-base font-bold">Session Expired</strong>
            This 24-hour consultation session has expired.
            <div className="mt-3">
              <button 
                onClick={async () => {
                  try {
                    await ChatService.followUp(numericSessionId);
                    window.location.reload();
                  } catch (e: any) {
                    alert(e.response?.data || "Failed to initiate follow up.");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Pay 40% Follow-Up Fee to Resume
              </button>
            </div>
          </div>
        )}
        
        {sessionDetails?.isFollowUp && (
          <div className="bg-[#e5efff] border border-[#b8d4ff] text-[#0055ff] p-2 rounded-lg text-xs mb-2 text-center font-bold tracking-wide uppercase">
            Follow-Up Session
          </div>
        )}

        {displayMessages.length === 0 ? (
          <p className="text-sm text-[#787584] text-center mt-8 font-medium">
            No messages yet.
          </p>
        ) : (
          displayMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === "User"} />
          ))
        )}
        <div ref={messagesEndRef} className="h-2 sm:h-4" />
      </div>

      {showAssessmentButton && (
        <div className="bg-[#f3f0ff] border-t border-[#e5deff] p-3 flex justify-center items-center shrink-0">
          <button 
            onClick={handleSendAssessment}
            className="flex items-center gap-2 bg-[#6a5acd] hover:bg-[#5b4eb8] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-colors"
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
        acceptedFileTypes=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.webm,.mkv,.wmv"
        disabled={sessionDetails ? (
          (new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000) || 
          (sessionDetails.isCompanyPaid && displayMessages.filter(m => m.senderId === "User").length >= 1)
        ) : false} 
      />
    </>
  );
}
