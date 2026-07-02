import api from "./api";
import type { ReceivedMessage } from "./chatHubService";

export default class ChatService {
  static async getHistory(sessionId: number): Promise<ReceivedMessage[]> {
    const response = await api.get(`chat/${sessionId}/messages`);
    // Backend returns { senderRole: ... } matching ReceivedMessage shape
    // one-to-one (both ChatMessageDTO and ReceiveMessagePayload use the
    // same field names), so no mapping needed here.
    return response.data;
  }
}
