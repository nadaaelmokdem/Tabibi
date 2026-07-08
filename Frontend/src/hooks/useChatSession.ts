import { useCallback, useEffect, useRef, useState } from "react";
import ChatService from "../services/chatService";
import {
  joinSession,
  leaveSession,
  onReceiveMessage,
  offReceiveMessage,
  sendMessage as sendHubMessage,
  subscribeToPresence,
  onUserPresenceChanged,
  offUserPresenceChanged,
  onUnauthorized,
  offUnauthorized,
  onSendMessageError,
  offSendMessageError,
} from "../services/chatHubService";
import type { ReceivedMessage } from "../types/ReceivedMessage";

import { useAuth } from "../context/AuthContext";

// One hook per open consultation chat. Handles: loading history on mount,
// joining the SignalR group for this session, appending live messages as
// they arrive, and cleaning up (leaving the group, removing the listener)
// on unmount or if the user navigates to a different session.
export function useChatSession(sessionId: number) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  // Keep the handler reference stable across renders so on/off match the
  // exact same function reference - required for connection.off() to work.
  const handleMessageRef = useRef<(msg: ReceivedMessage) => void>(() => {});
  const handlePresenceRef = useRef<(userId: string, isOnline: boolean) => void>(() => {});
  const handleUnauthorizedRef = useRef<(payload: { Message: string }) => void>(() => {});
  const handleSendMessageErrorRef = useRef<(message: string) => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    setMessages([]);
    setSessionDetails(null);
    setIsOtherUserOnline(false);

    handleMessageRef.current = (msg: ReceivedMessage) => {
      if (msg.sessionId !== sessionId) return; // ignore messages from other sessions, if any leak through
      setMessages((prev) => [...prev, msg]);
    };

    handlePresenceRef.current = (uid: string, online: boolean) => {
      setSessionDetails((prev: any) => {
        if (!prev) return prev;
        const myRole = user?.activeRole?.toLowerCase() === "doctor" ? "Doctor" : "User";
        const otherUserId = myRole === "Doctor" ? prev.patientUserId : prev.doctorUserId;
        
        if (uid === otherUserId) {
          setIsOtherUserOnline(online);
        }
        return prev;
      });
    };

    handleUnauthorizedRef.current = (payload: { Message: string }) => {
      setError(payload.Message || "You are not authorized to access this chat.");
    };

    handleSendMessageErrorRef.current = (message: string) => {
      setError(message || "Unable to send message right now.");
    };

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const details = await ChatService.getSessionDetails(sessionId);
        if (cancelled) return;
        setSessionDetails(details);
        
        const history = await ChatService.getHistory(sessionId);
        if (cancelled) return;
        setMessages(history);

        // We can get our own user ID from token, or just rely on details
        const myRole = user?.activeRole?.toLowerCase() === "doctor" ? "Doctor" : "User";
        
        const otherUserId = myRole === "Doctor" ? details.patientUserId : details.doctorUserId;

        onReceiveMessage(handleMessageRef.current);
        onUserPresenceChanged(handlePresenceRef.current);
        onUnauthorized(handleUnauthorizedRef.current);
        onSendMessageError(handleSendMessageErrorRef.current);
        await joinSession(sessionId);
        await subscribeToPresence(otherUserId);
        
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
      offUserPresenceChanged(handlePresenceRef.current);
      offUnauthorized(handleUnauthorizedRef.current);
      offSendMessageError(handleSendMessageErrorRef.current);
      setSessionDetails((prev: any) => {
        if (prev) {
          const myRole = user?.activeRole?.toLowerCase() === "doctor" ? "Doctor" : "User";
          const otherUserId = myRole === "Doctor" ? prev.patientUserId : prev.doctorUserId;
          // Note: connection may already be closed on unmount - safe to ignore
          import("../services/chatHubService").then(m => m.unsubscribeFromPresence(otherUserId).catch(() => {}));
        }
        return prev;
      });
      leaveSession(sessionId).catch(() => {
        // connection may already be closed on unmount - safe to ignore
      });
    };
  }, [sessionId, user?.id, user?.activeRole]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      try {
        setError(null);
        await sendHubMessage(sessionId, content.trim());
        // No optimistic local append here - the hub broadcasts back to the
        // sender too (see ChatHub.SendMessage), so the message will arrive
        // through onReceiveMessage with its real DB id/timestamp.
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to send message right now.");
      }
    },
    [sessionId]
  );

  return { messages, loading, error, connected, send, sessionDetails, isOtherUserOnline };
}
