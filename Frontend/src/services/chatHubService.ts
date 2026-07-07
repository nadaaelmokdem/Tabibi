import * as signalR from "@microsoft/signalr";
import type { ReceivedMessage } from "../types/ReceivedMessage";
export type { ReceivedMessage };


const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5009/api";
const HUB_URL = API_BASE.replace(/\/api\/?$/, "") + "/hubs/chat";

let connection: signalR.HubConnection | null = null;

export function getChatConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      withCredentials: true,
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
