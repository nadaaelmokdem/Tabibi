import { MdChatBubble } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { CARD_BASE } from "./PatientDashboardHeader";
import { CachedImage } from "../../../components/common/CachedImage";
import { getFileUrl } from "../../../utils/fileUtils";
import { formatChatSessionTime } from "../../../utils/dateUtils";
import { formatMessagePreview } from "../../../utils/textUtils";

interface PatientDashboardMessagesProps {
  recentChats: any[];
  chatSessionsCount: number;
}

export default function PatientDashboardMessages({
  recentChats,
  chatSessionsCount
}: PatientDashboardMessagesProps) {
  const navigate = useNavigate();

  return (
    <div className={`col-span-1 md:col-span-6 lg:col-span-6 bg-surface-container-lowest ${CARD_BASE} p-6 flex flex-col`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-on-surface">Recent Chats</h2>
          {chatSessionsCount > 0 && (
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {chatSessionsCount} chats
            </span>
          )}
        </div>
        <button onClick={() => navigate('/chat')} className="cursor-pointer text-sm font-medium text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4 flex-1">
        {recentChats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8">
            <MdChatBubble className="text-4xl text-on-surface-variant/30 mb-2" />
            <p className="text-sm text-on-surface-variant/80 text-center">
              No recent chats.
            </p>
          </div>
        ) : (
          recentChats.map((session, i) => (
            formatMessagePreview(session.lastMessage) == "" ? null : (
            <div key={session.sessionId}>
              <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/60 cursor-pointer" onClick={() => navigate(session.otherPartyUserId === 'AI' ? `/ai-chat/${session.sessionId}` : `/chat/${session.sessionId}`)}>
                <div className="relative shrink-0">
                  {session.otherPartyProfilePictureUrl ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                      <CachedImage
                        src={getFileUrl(session.otherPartyProfilePictureUrl)}
                        alt={session.otherPartyName || "Doctor"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-sm text-lg font-bold">
                      {(session.otherPartyName || "D").replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || "D"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-base text-on-surface font-semibold truncate">
                      {session.otherPartyUserId === 'AI' || (session.otherPartyName || "").startsWith("Dr.") ? (session.otherPartyName || "AI") : `Dr. ${session.otherPartyName || "Doctor"}`}
                    </h4>
                    <span className="text-xs text-on-surface-variant font-medium shrink-0 ml-2">{session.lastMessageTime ? formatChatSessionTime(session.lastMessageTime) : ''}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant truncate">{formatMessagePreview(session.lastMessage) || "No messages yet"}</p>
                </div>
              </div>
              {i < recentChats.length - 1 && <hr className="border-surface-variant/60 mt-4" />}
            </div>
          )
          ))
        )}
      </div>
    </div>
  );
}
