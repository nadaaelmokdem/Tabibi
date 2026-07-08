export interface ReceivedMessage {
  messageId: number;
  sessionId: number;
  senderRole: string;
  senderUserId?: string;
  senderName: string;
  content: string;
  sentAt: string;
}