import * as signalR from "@microsoft/signalr";
import type { ReceivedMessage } from "../types/ReceivedMessage";


const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5009/api";
const HUB_URL = API_BASE.replace(/\/api\/?$/, "") + "/hubs/chat";

let connection: signalR.HubConnection | null = null;
const joinedSessions = new Set<number>();

function registerReconnectHandler(conn: signalR.HubConnection): void {
  if ((conn as signalR.HubConnection & { __rejoinHandlerRegistered?: boolean }).__rejoinHandlerRegistered) {
    return;
  }

  (conn as signalR.HubConnection & { __rejoinHandlerRegistered?: boolean }).__rejoinHandlerRegistered = true;
  conn.onreconnected(async () => {
    for (const sessionId of joinedSessions) {
      try {
        await conn.invoke("JoinSession", sessionId);
      } catch {
        // Ignore rejoin errors until the next reconnect attempt.
      }
    }
  });
}

export function getChatConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // Register a default no-op handler to suppress the missing client method warning
  connection.on("UserPresenceChanged", () => {});
  registerReconnectHandler(connection);

  return connection;
}

export async function startConnection(): Promise<signalR.HubConnection> {
  const conn = getChatConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }
  return conn;
}

export async function stopConnection(): Promise<void> {
  if (connection) {
    try {
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        await connection.stop();
      }
    } finally {
      connection = null;
      joinedSessions.clear();
    }
  }
}

export async function resetConnection(): Promise<void> {
  await stopConnection();
}

export async function joinSession(sessionId: number): Promise<void> {
  const conn = await startConnection();
  await conn.invoke("JoinSession", sessionId);
  joinedSessions.add(sessionId);
}

export async function leaveSession(sessionId: number): Promise<void> {
  if (!connection) return;
  await connection.invoke("LeaveSession", sessionId);
  joinedSessions.delete(sessionId);
}

export async function sendMessage(sessionId: number, content: string): Promise<void> {
  const conn = await startConnection();
  await conn.invoke("SendMessage", { sessionId, content });
}

export function onReceiveMessage(callback: (message: ReceivedMessage) => void): void {
  const conn = getChatConnection();
  conn.on("ReceiveMessage", callback);
}

export function offReceiveMessage(callback: (message: ReceivedMessage) => void): void {
  if (!connection) return;
  connection.off("ReceiveMessage", callback);
}

export async function subscribeToPresence(userId: string): Promise<void> {
  const conn = await startConnection();
  await conn.invoke("SubscribeToPresence", userId);
}

export async function unsubscribeFromPresence(userId: string): Promise<void> {
  if (!connection) return;
  await connection.invoke("UnsubscribeFromPresence", userId);
}

export function onUserPresenceChanged(callback: (userId: string, isOnline: boolean) => void): void {
  const conn = getChatConnection();
  conn.on("UserPresenceChanged", callback);
}

export function offUserPresenceChanged(callback: (userId: string, isOnline: boolean) => void): void {
  if (!connection) return;
  connection.off("UserPresenceChanged", callback);
}

export function onUpdateSessionList(callback: (payload: ReceivedMessage) => void): void {
  const conn = getChatConnection();
  conn.on("UpdateSessionList", callback);
}

export function offUpdateSessionList(callback: (payload: ReceivedMessage) => void): void {
  if (!connection) return;
  connection.off("UpdateSessionList", callback);
}

export function onUnauthorized(callback: (payload: { Message: string }) => void): void {
  const conn = getChatConnection();
  conn.on("Unauthorized", callback);
}

export function offUnauthorized(callback: (payload: { Message: string }) => void): void {
  if (!connection) return;
  connection.off("Unauthorized", callback);
}

export function onSendMessageError(callback: (message: string) => void): void {
  const conn = getChatConnection();
  conn.on("SendMessageError", callback);
}

export function offSendMessageError(callback: (message: string) => void): void {
  if (!connection) return;
  connection.off("SendMessageError", callback);
}
