import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ChatService from "../../services/chatService";
import { onUpdateSessionList, offUpdateSessionList } from "../../services/chatHubService";
import type { ReceivedMessage } from "../../types/ReceivedMessage";
import { FaUserMd } from "react-icons/fa";
import { TbLayoutSidebarRightCollapse } from "react-icons/tb";
import type { SessionInfo, GroupedContact } from "../../types/chat";
import RegularChatSidebar from "../../components/Chat/RegularChat/RegularChatSidebar";
import ActiveChatPane from "../../components/Chat/RegularChat/ActiveChatPane";

export default function DoctorChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"contacts" | "recent">("recent");
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024 || !sessionId);
  const [includeAI, setIncludeAI] = useState(false);

  const numericSessionId = sessionId ? Number(sessionId) : undefined;
  const isDoctor = user?.activeRole?.toLowerCase() === "doctor";

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setSessions([]);
        setExpandedContactId(null);
      }
    }, 0);

    const fetchSessions = () => {
      ChatService.getSessions(user?.activeRole).then(data => {
        let filteredSessions = data;
        if (isDoctor) {
          filteredSessions = data.filter((s: any) => s.lastMessage && s.lastMessage.trim() !== "");
        } else {
          if (!includeAI) {
            filteredSessions = data.filter((s: any) => s.otherPartyUserId !== "AI" && s.otherPartyName !== "AI Medical Assistant");
          }
        }
        if (active) setSessions(filteredSessions);
      }).catch(console.error);
    };

    fetchSessions();

    const handleUpdateSessionList = (payload: ReceivedMessage) => {
      if (!isDoctor && !includeAI) {
        if (payload.senderRole === "AI" || (payload as any).senderId === "AI" || payload.senderRole === "System") return;
      }

      setSessions((prev) => {
        const idx = prev.findIndex(s => s.sessionId === payload.sessionId);
        if (idx === -1) {
          fetchSessions();
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
      active = false;
      offUpdateSessionList(handleUpdateSessionList);
    };
  }, [user?.id, user?.activeRole, isDoctor, includeAI]);

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [sessions]);

  const groupedContacts = useMemo(() => {
    const map = new Map<string, GroupedContact>();
    sessions.forEach(s => {
      if (!map.has(s.otherPartyUserId)) {
        map.set(s.otherPartyUserId, {
          id: s.otherPartyUserId,
          name: isDoctor || s.otherPartyUserId === "AI" ? s.otherPartyName : (s.otherPartyName.startsWith("Dr.") ? s.otherPartyName : `Dr. ${s.otherPartyName}`),
          specialty: s.otherPartySpecialty,
          avatar: s.otherPartyProfilePictureUrl,
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
  }, [sessions, isDoctor]);

  useEffect(() => {
    if (numericSessionId && sessions.length > 0) {
      const session = sessions.find(s => s.sessionId === numericSessionId);
      if (session) {
        setTimeout(() => setExpandedContactId(session.otherPartyUserId), 0);
      }
    }
  }, [numericSessionId, sessions]);

  return (
    <main className="flex-1 flex overflow-hidden max-w-[1440px] mx-auto w-full h-[calc(100dvh-64px)] lg:h-dvh bg-surface-bright">
      
      {/* Left Sidebar */}
      <RegularChatSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        numericSessionId={numericSessionId}
        isDoctor={isDoctor}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        includeAI={includeAI}
        setIncludeAI={setIncludeAI}
        recentSessions={recentSessions}
        groupedContacts={groupedContacts}
        expandedContactId={expandedContactId}
        setExpandedContactId={setExpandedContactId}
        navigate={navigate as any}
      />

      {/* Right Chat Pane */}
      <section className={`flex-1 flex flex-col bg-surface-bright relative min-w-0 ${(!numericSessionId || isSidebarOpen) ? 'hidden md:flex' : 'flex'}`}>
        {numericSessionId ? (
          <ActiveChatPane 
            numericSessionId={numericSessionId} 
            navigate={navigate as any}
            onBack={() => navigate('/chat')} 
            isSidebarOpen={isSidebarOpen}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            isDoctor={isDoctor}
            sessions={sessions}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
             {!isSidebarOpen && (
               <button
                 className="absolute top-4 left-4 cursor-pointer p-2 text-on-surface-variant hover:text-primary-dark hover:bg-surface-container-high rounded-lg transition-colors hidden md:block"
                 onClick={() => setIsSidebarOpen(true)}
               >
                 <TbLayoutSidebarRightCollapse className="text-[24px]" />
               </button>
             )}
             <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6 shadow-inner border border-surface-variant">
               <FaUserMd className="text-4xl text-primary" />
             </div>
             <h3 className="text-2xl font-extrabold text-on-surface mb-2 tracking-tight">{isDoctor ? "Doctor Messages" : "Chats"}</h3>
             <p className="text-on-surface-variant max-w-md font-medium text-sm leading-relaxed">Select a {isDoctor ? "patient" : "doctor or AI chat"} or a recent consultation session from the sidebar to view the conversation and reply.</p>
          </div>
        )}
      </section>
    </main>
  );
}
