import { useParams } from "react-router-dom";
import { useMemo, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useChatSession } from "../hooks/useChatSession";
import { MessageBubble, ChatInput } from "../components/Chat/MainContent";
import type Message from "../types/Message";

export default function ConsultationChat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const numericSessionId = Number(sessionId);
  const { messages, loading, error, connected, send } = useChatSession(numericSessionId);

  // user.userType is "user" (patient) or "doctor" per AppUser typing -
  // map that onto the SenderRole strings the backend uses.
  const myRole = user?.userType === "doctor" ? "Doctor" : "Patient";

  const displayMessages: Message[] = useMemo(
    () =>
      messages.map((m) => ({
        id: String(m.messageId),
        senderId: m.senderRole, // "Patient" | "Doctor" - only two participants, so this is enough to distinguish sides
        text: m.content,
        timestamp: new Date(m.sentAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    [messages]
  );

  const otherPartyName = useMemo(() => {
    const theirMessage = messages.find((m) => m.senderRole !== myRole);
    return theirMessage?.senderName ?? (myRole === "Patient" ? "Doctor" : "Patient");
  }, [messages, myRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  if (!sessionId || Number.isNaN(numericSessionId)) {
    return <div className="p-8 text-[#2A2455]/60">Invalid chat session.</div>;
  }

  if (loading) {
    return <div className="p-8 text-[#2A2455]/60">Loading conversation...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-[#2A2455]/60">
        Couldn't load this chat. {error}
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden max-w-[900px] mx-auto w-full h-[calc(100dvh-70px)]">
      <div className="px-4 sm:px-6 py-3 border-b border-[#e5deff] bg-white flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold text-[#1a1345]">{otherPartyName}</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            connected ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {connected ? "Live" : "Connecting..."}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 bg-[#fcf8ff]">
        {displayMessages.length === 0 ? (
          <p className="text-sm text-[#787584] text-center mt-8">
            No messages yet - say hello to start the conversation.
          </p>
        ) : (
          displayMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === myRole} />
          ))
        )}
        <div ref={messagesEndRef} className="h-2 sm:h-4" />
      </div>

      <ChatInput onSendMessage={send} isLoading={false} />
    </main>
  );
}
