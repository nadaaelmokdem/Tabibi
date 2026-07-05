import * as signalR from "@microsoft/signalr";
import api from "./api";

// api.ts's baseURL is "http://localhost:5009/api" - the hub lives at the
// root ("http://localhost:5009/hubs/chat"), not under /api, so strip it.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5009/api";
const HUB_URL = API_BASE.replace(/\/api\/?$/, "") + "/hubs/chat";

export interface ReceivedMessage {
  messageId: number;
  sessionId: number;
  senderRole: "Patient" | "Doctor";
  senderName: string;
  content: string;
  sentAt: string;
}

let connection: signalR.HubConnection | null = null;

// The JWT lives only in the in-memory axios default header (see
// authService.ts - it's never written to localStorage), so we read it back
// out of there rather than maintaining a second copy of the token.
function getAccessToken(): string {
  const header = api.defaults.headers.common["Authorization"] as string | undefined;
  if (!header) return "";
  return header.replace("Bearer ", "");
}

export function getChatConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: getAccessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

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
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop();
  }
}

export async function joinSession(sessionId: number): Promise<void> {
  const conn = await startConnection();
  await conn.invoke("JoinSession", sessionId);
}

// Admin-only: joins the session's group to watch messages arrive live,
// without being validated as a patient/doctor participant. Never sends.
export async function joinAsObserver(sessionId: number): Promise<void> {
  const conn = await startConnection();
  await conn.invoke("JoinAsObserver", sessionId);
}

export async function leaveSession(sessionId: number): Promise<void> {
  if (!connection) return;
  await connection.invoke("LeaveSession", sessionId);
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
