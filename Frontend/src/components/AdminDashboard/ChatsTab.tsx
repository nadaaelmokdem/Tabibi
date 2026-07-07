import { useEffect, useState } from "react";
import AdminService from "../../services/adminService";
import {
  joinAsObserver,
  leaveSession,
  onReceiveMessage,
  offReceiveMessage,
  type ReceivedMessage,
} from "../../services/chatHubService";
import type { AdminChatSession, AdminChatMessage } from "../../types/admin";

export default function ChatsTab() {
  const [sessions, setSessions] = useState<AdminChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<AdminChatSession | null>(null);

  useEffect(() => {
    AdminService.getChatSessions()
      .then(setSessions)
      .catch((err) => setError(err.message ?? "Failed to load chats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#2A2455]/60 text-sm">Loading chats...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  if (selectedSession) {
    return (
      <ChatTranscript
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl overflow-hidden">
      {sessions.length === 0 ? (
        <p className="p-5 text-sm text-gray-400">No chat sessions yet.</p>
      ) : (
        <ul className="divide-y divide-[#F4F1FF]">
          {sessions.map((s) => (
            <li
              key={s.sessionId}
              onClick={() => setSelectedSession(s)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F8F7FF]"
            >
              <div>
                <p className="font-semibold text-[#2A2455]">
                  {s.patientName} &harr; {s.doctorName}
                </p>
                <p className="text-sm text-[#2A2455]/60">
                  {s.messageCount} messages · started{" "}
                  {new Date(s.startedAt).toLocaleString()}
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#F4F1FF] text-[#6A5ACD]">
                {s.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatTranscript({
  session,
  onBack,
}: {
  session: AdminChatSession;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function handleLive(msg: ReceivedMessage) {
      if (msg.sessionId !== session.sessionId) return;
      setMessages((prev) => [
        ...prev,
        {
          messageId: msg.messageId,
          sessionId: msg.sessionId,
          senderRole: msg.senderRole,
          senderName: msg.senderName,
          content: msg.content,
          sentAt: msg.sentAt,
        },
      ]);
    }

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const history = await AdminService.getChatMessages(session.sessionId);
        if (cancelled) return;
        setMessages(history);
        onReceiveMessage(handleLive);
        await joinAsObserver(session.sessionId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load transcript.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      offReceiveMessage(handleLive);
      leaveSession(session.sessionId).catch(() => {
        // connection may already be closed on unmount - safe to ignore
      });
    };
  }, [session.sessionId]);

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
      <button
        onClick={onBack}
        className="text-sm font-bold text-[#6A5ACD] hover:underline mb-4"
      >
        &larr; Back to chats
      </button>
      <p className="font-semibold text-[#2A2455] mb-3">
        {session.patientName} &harr; {session.doctorName}
      </p>

      {loading && <p className="text-sm text-[#2A2455]/60">Loading transcript...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3 max-h-[28rem] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.messageId} className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-[#2A2455]">{m.senderName}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(m.sentAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-[#2A2455]/80 bg-[#F8F7FF] rounded-lg p-2 mt-1 inline-block max-w-xl">
                {m.content}
              </p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-gray-400">No messages in this session yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
