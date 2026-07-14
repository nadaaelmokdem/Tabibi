import * as signalR from "@microsoft/signalr";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5009/api";
const HUB_URL = API_BASE.replace(/\/api\/?$/, "") + "/hubs/videocall";

type EventCallback = (...args: any[]) => void;

class VideoCallHubService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Record<string, EventCallback[]> = {};
  private static instance: VideoCallHubService;

  private constructor() {}

  public static getInstance(): VideoCallHubService {
    if (!VideoCallHubService.instance) {
      VideoCallHubService.instance = new VideoCallHubService();
    }
    return VideoCallHubService.instance;
  }

  public getConnection(): signalR.HubConnection {
    if (this.connection) return this.connection;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onreconnecting((error) => {
      console.warn("VideoCallHub reconnecting:", error);
      this.emit("reconnecting", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("VideoCallHub reconnected. ConnectionId:", connectionId);
      this.emit("reconnected", connectionId);
    });

    this.connection.onclose((error) => {
      console.warn("VideoCallHub closed:", error);
      this.emit("closed", error);
    });

    // Default event bindings that UI can tap into
    this.connection.on("UserJoined", (userId: string) => {
      this.emit("UserJoined", userId);
    });

    this.connection.on("UserLeft", (userId: string) => {
      this.emit("UserLeft", userId);
    });

    this.connection.on("ReceiveSignal", (userId: string, signalData: any) => {
      this.emit("ReceiveSignal", userId, signalData);
    });

    this.connection.on("PeerReconnected", (userId: string) => {
      this.emit("PeerReconnected", userId);
    });

    this.connection.on("ReceiveMessage", (userId: string, message: string) => {
      this.emit("ReceiveMessage", userId, message);
    });

    return this.connection;
  }

  public async startConnection(): Promise<signalR.HubConnection> {
    const conn = this.getConnection();
    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start();
    }
    return conn;
  }

  public async stopConnection(): Promise<void> {
    if (this.connection) {
      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
      }
      this.connection = null;
    }
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }

  public async joinCall(sessionId: number): Promise<void> {
    const conn = await this.startConnection();
    await conn.invoke("JoinCall", sessionId);
  }

  public async leaveCall(sessionId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("LeaveCall", sessionId);
  }

  public async sendSignal(sessionId: number, targetUserId: string, signalData: any): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("SendSignal", sessionId, targetUserId, signalData);
  }

  public async sendMessage(sessionId: number, message: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("SendMessage", sessionId, message);
  }
}

export const videoCallHubService = VideoCallHubService.getInstance();
