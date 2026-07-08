import api from "./api";
import type { ReceivedMessage } from "../types/ReceivedMessage";

export default class ChatService {
  static async getHistory(sessionId: number): Promise<ReceivedMessage[]> {
    const response = await api.get(`chat/${sessionId}/messages`);
    return response.data;
  }

  static async startSession(doctorId: number, isCompanyPaid: boolean = false, clinicalAssessment?: string | null): Promise<number> {
    const body = clinicalAssessment ? { clinicalAssessment } : {};
    const response = await api.post(`chat/start/${doctorId}?isCompanyPaid=${isCompanyPaid}`, body);
    return response.data.sessionId;
  }

  static async followUp(sessionId: number): Promise<number> {
    const response = await api.post(`chat/${sessionId}/followup`);
    return response.data.sessionId;
  }

  static async getSessionDetails(sessionId: number): Promise<{
    sessionId: number;
    doctorName: string;
    doctorSpecialty: string;
    patientName: string;
    doctorUserId: string;
    patientUserId: string;
    isCompanyPaid: boolean;
    isFollowUp: boolean;
    startedAt: string;
  }> {
    const response = await api.get(`chat/${sessionId}/details`);
    return response.data;
  }

  static async getSessions(activeRole?: string): Promise<Array<{
    sessionId: number;
    otherPartyName: string;
    otherPartyUserId: string;
    otherPartySpecialty: string;
    lastMessage: string;
    lastMessageTime: string | null;
    lastMessageRole?: string | null;
  }>> {
    const response = await api.get(`chat/sessions`, { params: { activeRole } });
    return response.data;
  }
}
