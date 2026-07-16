import { HiSparkles } from "react-icons/hi";
import { TbLayoutSidebarLeftCollapse } from "react-icons/tb";
import { formatChatSessionTime } from "../../../utils/dateUtils";
import { formatMessagePreview } from "../../../utils/textUtils";
import { useNavigate } from "react-router-dom";

interface AIChatSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  numericSessionId: number | undefined;
  recentSessions: any[];
}

export default function AIChatSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  numericSessionId,
  recentSessions,
}: AIChatSidebarProps) {
  const navigate = useNavigate();

  const handleSessionClick = (sessionId: number) => {
    navigate(`/ai-chat/${sessionId}`);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewChatClick = () => {
    navigate("/ai-chat");
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
            <HiSparkles className="text-primary" /> AI Chat
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="cursor-pointer p-2 -mr-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary-dark rounded-lg transition-colors"
          >
            <TbLayoutSidebarLeftCollapse className="text-[20px]" />
          </button>
        </div>
        <button
          className="w-full bg-gradient-to-r from-primary-light to-primary text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold hover:opacity-90 transition-opacity shadow-md cursor-pointer mb-2"
          onClick={handleNewChatClick}
        >
          <HiSparkles className="text-[18px]" />
          New AI Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {recentSessions.length === 0 ? (
           <p className="text-center text-outline text-sm mt-6">No recent consultations.</p>
        ) : (
           recentSessions.map(session => (
              <div 
                key={session.sessionId}
                onClick={() => handleSessionClick(session.sessionId)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${numericSessionId === session.sessionId ? 'bg-surface-container border-primary-light' : 'bg-white border-surface-container hover:border-primary-light hover:shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <span className="font-bold text-on-surface text-sm break-words whitespace-normal flex items-start gap-2">
                    <HiSparkles className="text-primary mt-1 flex-shrink-0" /> {session.otherPartyName}
                  </span>
                  <span className="text-xs font-medium text-outline shrink-0">
                    {session.lastMessageTime ? formatChatSessionTime(session.lastMessageTime) : ''}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant line-clamp-2">{formatMessagePreview(session.lastMessage) || "No messages"}</p>
              </div>
           ))
        )}
      </div>
    </aside>
  );
}
