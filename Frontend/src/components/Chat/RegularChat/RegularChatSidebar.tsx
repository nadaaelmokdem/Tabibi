import { FaUserMd, FaUsers, FaRegClock, FaChevronRight } from "react-icons/fa";
import { TbLayoutSidebarLeftCollapse } from "react-icons/tb";
import { formatChatSessionTime } from "../../../utils/dateUtils";
import { formatMessagePreview } from "../../../utils/textUtils";
import type { SessionInfo, GroupedContact } from "../../../types/chat";

interface RegularChatSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  numericSessionId: number | undefined;
  isDoctor: boolean;
  activeTab: "contacts" | "recent";
  setActiveTab: (tab: "contacts" | "recent") => void;
  includeAI: boolean;
  setIncludeAI: (include: boolean) => void;
  recentSessions: SessionInfo[];
  groupedContacts: GroupedContact[];
  expandedContactId: string | null;
  setExpandedContactId: (id: string | null) => void;
  navigate: (path: string) => void;
}

export default function RegularChatSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  numericSessionId,
  isDoctor,
  activeTab,
  setActiveTab,
  includeAI,
  setIncludeAI,
  recentSessions,
  groupedContacts,
  expandedContactId,
  setExpandedContactId,
  navigate
}: RegularChatSidebarProps) {
  const handleSessionClick = (sessionId: number) => {
    navigate(`/chat/${sessionId}`);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <aside className={`
      flex flex-col bg-white border-r border-surface-variant transition-all duration-300 ease-in-out shrink-0
      ${isSidebarOpen 
        ? `w-full md:w-[350px] lg:w-[400px] translate-x-0 flex`
        : `w-0 overflow-hidden border-none -translate-x-full md:translate-x-0 hidden md:flex`
      }
    `}>
      <div className="p-4 border-b border-surface-variant w-full md:w-[350px] lg:w-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <FaUserMd className="text-primary" /> {isDoctor ? "My Patients" : "Chats"}
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="cursor-pointer p-2 -mr-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary-dark rounded-lg transition-colors"
          >
            <TbLayoutSidebarLeftCollapse className="text-[20px]" />
          </button>
        </div>
        
        <div className="flex bg-surface-container rounded-lg p-1 gap-1 border border-surface-variant mb-3">
          <button 
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "contacts" ? 'bg-white text-primary shadow-sm border border-surface-variant' : 'text-outline hover:text-on-surface'}`}
          >
            <FaUsers /> {isDoctor ? "By Patient" : "By Doctor"}
          </button>
          <button 
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "recent" ? 'bg-white text-primary shadow-sm border border-surface-variant' : 'text-outline hover:text-on-surface'}`}
          >
            <FaRegClock /> Recent
          </button>
        </div>

        {!isDoctor && (
          <div className="flex items-center justify-end px-1 pb-1">
            <label className="flex items-center cursor-pointer relative">
              <span className="mr-2 text-sm font-medium text-on-surface-variant">Include AI</span>
              <input 
                type="checkbox" 
                checked={includeAI}
                onChange={(e) => setIncludeAI(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${includeAI ? 'bg-primary' : 'bg-outline-variant'}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full mt-[3px] ml-1 shadow-sm transform transition-transform ${includeAI ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === "recent" && (
          recentSessions.length === 0 ? (
            <p className="text-center text-outline text-sm mt-6">No recent messages.</p>
          ) : (
            recentSessions.map(session => (
              <div 
                key={session.sessionId}
                onClick={() => handleSessionClick(session.sessionId)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${numericSessionId === session.sessionId ? 'bg-surface-container border-primary-light' : 'bg-white border-surface-container hover:border-primary-light hover:shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <span className="font-bold text-on-surface text-sm break-words whitespace-normal">
                    {!isDoctor && session.otherPartyUserId !== "AI" && !session.otherPartyName.startsWith("Dr.") ? `Dr. ${session.otherPartyName}` : session.otherPartyName}
                  </span>
                  <span className="text-xs font-medium text-outline shrink-0">
                    {session.lastMessageTime ? formatChatSessionTime(session.lastMessageTime) : ''}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant line-clamp-2">{formatMessagePreview(session.lastMessage) || "No messages"}</p>
              </div>
            ))
          )
        )}

        {activeTab === "contacts" && (
          groupedContacts.length === 0 ? (
            <p className="text-center text-outline text-sm mt-6">No chats found.</p>
          ) : (
            groupedContacts.map(contact => (
              <div key={contact.id} className={`bg-white rounded-xl transition-all border ${expandedContactId === contact.id ? 'border-primary-light shadow-sm mb-3' : 'border-surface-container mb-2 hover:border-primary-light'}`}>
                <button 
                  onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}
                  className="w-full p-4 flex justify-between items-center bg-transparent transition-colors rounded-xl cursor-pointer"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-on-surface text-[15px] break-words whitespace-normal">{contact.name}</span>
                    {contact.specialty && (
                      <span className="text-[12px] font-medium text-outline mt-0.5">{contact.specialty}</span>
                    )}
                    <span className="text-[13px] font-medium text-primary mt-1">{contact.sessions.length} Session{contact.sessions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <FaChevronRight className={`text-on-surface-variant text-sm transition-transform ${expandedContactId === contact.id ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedContactId === contact.id && (
                  <div className="bg-surface-container p-3 border-t border-surface-variant space-y-2 rounded-b-xl">
                    {contact.sessions.map((session, idx) => (
                      <div 
                        key={session.sessionId}
                        onClick={() => handleSessionClick(session.sessionId)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${numericSessionId === session.sessionId ? 'bg-white border-primary shadow-sm' : 'bg-white border-surface-variant hover:border-primary-light'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-bold ${numericSessionId === session.sessionId ? 'text-primary' : 'text-on-surface'}`}>Session {contact.sessions.length - idx}</span>
                          <span className="text-[11px] font-semibold text-outline bg-surface-container-high px-2 py-0.5 rounded-full">
                            {session.lastMessageTime ? formatChatSessionTime(session.lastMessageTime) : 'New'}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-1 font-medium">{formatMessagePreview(session.lastMessage) || "No messages"}</p>
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
  );
}
