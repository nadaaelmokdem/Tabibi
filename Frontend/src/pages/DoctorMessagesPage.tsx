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
import { formatTimeTo12Hour } from "../utils/dateUtils";
import Skeleton from "../components/common/Skeleton";
import NetworkError from "../components/common/NetworkError";

interface SessionInfo {
  sessionId: number;
  otherPartyName: string;
  otherPartyUserId: string;
  lastMessage: string;
  lastMessageTime: string | null;
}

interface GroupedPatient {
  patientId: string;
  patientName: string;
  latestMessageTime: number;
  sessions: SessionInfo[];
}

export default function DoctorMessagesPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"patients" | "recent">("recent");
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const numericSessionId = sessionId ? Number(sessionId) : undefined;
  
  useEffect(() => {
    setSessions([]);
    setExpandedPatientId(null);

    ChatService.getSessions(user?.activeRole).then(data => {
      // Filter out empty sessions (where patient hasn't written anything yet)
      const activeSessions = data.filter(s => s.lastMessage && s.lastMessage.trim() !== "");
      setSessions(activeSessions);
    }).catch(err => console.error(err));

    const handleUpdateSessionList = (payload: ReceivedMessage) => {
      setSessions((prev) => {
        const idx = prev.findIndex(s => s.sessionId === payload.sessionId);
        if (idx === -1) {
          // If a new session (or previously empty one) gets a message, refetch to get patient info
          ChatService.getSessions(user?.activeRole).then(data => {
            const activeSessions = data.filter(s => s.lastMessage && s.lastMessage.trim() !== "");
            setSessions(activeSessions);
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
  }, [user?.id, user?.activeRole]);

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [sessions]);

  const groupedPatients = useMemo(() => {
    const map = new Map<string, GroupedPatient>();
    sessions.forEach(s => {
      if (!map.has(s.otherPartyUserId)) {
        map.set(s.otherPartyUserId, {
          patientId: s.otherPartyUserId,
          patientName: s.otherPartyName,
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


  // Open corresponding patient if a session is selected
  useEffect(() => {
    if (numericSessionId && sessions.length > 0) {
      const session = sessions.find(s => s.sessionId === numericSessionId);
      if (session) {
        setExpandedPatientId(session.otherPartyUserId);
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
              <FaUserMd className="text-[#6a5acd]" /> My Patients
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
              onClick={() => setActiveTab("patients")}
              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === "patients" ? 'bg-white text-[#6a5acd] shadow-sm border border-[#e5deff]' : 'text-[#787584] hover:text-[#1a1345]'}`}
            >
              <FaUsers /> By Patient
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
                  onClick={() => navigate(`/chat/${session.sessionId}`)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${numericSessionId === session.sessionId ? 'bg-[#f0ebff] border-[#b8a7ff]' : 'bg-white border-[#f0ebff] hover:border-[#b8a7ff] hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <span className="font-bold text-[#1a1345] text-sm break-words whitespace-normal">{session.otherPartyName}</span>
                    <span className="text-xs font-medium text-[#787584] shrink-0">
                      {session.lastMessageTime ? new Date(session.lastMessageTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#474553] line-clamp-2">{session.lastMessage || "No messages"}</p>
                </div>
              ))
            )
          )}

          {activeTab === "patients" && (
            groupedPatients.length === 0 ? (
              <p className="text-center text-[#787584] text-sm mt-6">No patients found.</p>
            ) : (
              groupedPatients.map(patient => (
                <div key={patient.patientId} className={`bg-white rounded-xl transition-all border ${expandedPatientId === patient.patientId ? 'border-[#b8a7ff] shadow-sm mb-3' : 'border-[#f0ebff] mb-2 hover:border-[#b8a7ff]'}`}>
                  <button 
                    onClick={() => setExpandedPatientId(expandedPatientId === patient.patientId ? null : patient.patientId)}
                    className="w-full p-4 flex justify-between items-center bg-transparent transition-colors rounded-xl"
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-[#1a1345] text-[15px] break-words whitespace-normal">{patient.patientName}</span>
                      <span className="text-[13px] font-medium text-[#6a5acd] mt-0.5">{patient.sessions.length} Session{patient.sessions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <FaChevronRight className={`text-[#474553] text-sm transition-transform ${expandedPatientId === patient.patientId ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {expandedPatientId === patient.patientId && (
                    <div className="bg-[#f8f7ff] p-3 border-t border-[#e5deff] space-y-2 rounded-b-xl">
                      {patient.sessions.map((session, idx) => (
                        <div 
                          key={session.sessionId}
                          onClick={() => navigate(`/chat/${session.sessionId}`)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${numericSessionId === session.sessionId ? 'bg-white border-[#6a5acd] shadow-sm' : 'bg-white border-[#e5deff] hover:border-[#b8a7ff]'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-sm font-bold ${numericSessionId === session.sessionId ? 'text-[#6a5acd]' : 'text-[#1a1345]'}`}>Session {patient.sessions.length - idx}</span>
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
            onBack={() => navigate('/messages')} 
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
             <h3 className="text-2xl font-extrabold text-[#1a1345] mb-2 tracking-tight">Doctor Messages</h3>
             <p className="text-[#474553] max-w-md font-medium text-sm leading-relaxed">Select a patient or a recent consultation session from the sidebar to view the conversation and reply.</p>
          </div>
        )}
      </section>
    </main>
  );
}

// Extracted to avoid hook rules violation conditionally
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
  const { user } = useAuth();
  const { messages, loading, error, send, sessionDetails, isOtherUserOnline } = useChatSession(numericSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
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

  const contact: Contact = useMemo(() => ({
    id: numericSessionId.toString(),
    name: sessionDetails?.patientName || "Patient",
    avatar: "",
    lastMessage: "",
    time: "",
    unread: 0,
    online: isOtherUserOnline,
    specialty: ""
  }), [numericSessionId, sessionDetails, isOtherUserOnline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  if (loading) return <div className="flex-1 p-8"><Skeleton className="h-full min-h-[400px] w-full" /></div>;
  if (error) return <div className="flex-1 flex items-center justify-center"><NetworkError message={error} /></div>;

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
             {contact.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-extrabold text-[#1a1345] leading-tight text-[17px]">{contact.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${contact.online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}></span>
              <span className="text-[12px] font-semibold text-[#787584]">
                {contact.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-[#fcf8ff]">
        {sessionDetails && new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-2 text-center shadow-sm">
            <strong className="block mb-1 text-base font-bold">Session Expired</strong>
            This 24-hour consultation session has expired. The patient must initiate a follow-up.
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
          displayMessages.map((msg) => {
            const isMine = msg.senderId === currentUserId || msg.senderId === user?.id;
            return <MessageBubble key={msg.id} msg={msg} isMe={isMine} />;
          })
        )}
        <div ref={messagesEndRef} className="h-2 sm:h-4" />
      </div>

      <ChatInput 
        onSendMessage={send} 
        isLoading={false} 
        acceptedFileTypes=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.avi,.webm,.mkv,.wmv"
        disabled={sessionDetails ? (new Date(sessionDetails.startedAt).getTime() < now - 24 * 60 * 60 * 1000) : false} 
      />
    </>
  );
}
