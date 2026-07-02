import { useCallback, useEffect, useRef, useState } from "react";
import ChatService from "../services/chatService";
import {
  joinSession,
  leaveSession,
  onReceiveMessage,
  offReceiveMessage,
  sendMessage as sendHubMessage,
  type ReceivedMessage,
} from "../services/chatHubService";

// One hook per open consultation chat. Handles: loading history on mount,
// joining the SignalR group for this session, appending live messages as
// they arrive, and cleaning up (leaving the group, removing the listener)
// on unmount or if the user navigates to a different session.
export function useChatSession(sessionId: number) {
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Keep the handler reference stable across renders so on/off match the
  // exact same function reference - required for connection.off() to work.
  const handleMessageRef = useRef<(msg: ReceivedMessage) => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    handleMessageRef.current = (msg: ReceivedMessage) => {
      if (msg.sessionId !== sessionId) return; // ignore messages from other sessions, if any leak through
      setMessages((prev) => [...prev, msg]);
    };

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const history = await ChatService.getHistory(sessionId);
        if (cancelled) return;
        setMessages(history);

        onReceiveMessage(handleMessageRef.current);
        await joinSession(sessionId);
        if (!cancelled) setConnected(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      offReceiveMessage(handleMessageRef.current);
      leaveSession(sessionId).catch(() => {
        // connection may already be closed on unmount - safe to ignore
      });
    };
  }, [sessionId]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await sendHubMessage(sessionId, content.trim());
      // No optimistic local append here - the hub broadcasts back to the
      // sender too (see ChatHub.SendMessage), so the message will arrive
      // through onReceiveMessage with its real DB id/timestamp.
    },
    [sessionId]
  );

  return { messages, loading, error, connected, send };
}
