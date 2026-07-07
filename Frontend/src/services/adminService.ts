import { isAxiosError } from "axios";
import api from "./api";
import type { AdminDashboardData, PendingDoctor } from "../types/dashboard";
import type {
  AdminDoctor,
  DoctorDecision,
  AdminUser,
  AdminAppointment,
  AdminChatSession,
  AdminChatMessage,
} from "../types/admin";

export default class AdminService {
  static async getDashboard(): Promise<AdminDashboardData> {
    const response = await api.get("admin/dashboard-summary");
    return response.data;
  }

  static async getPendingDoctors(): Promise<PendingDoctor[]> {
    const response = await api.get("admin/doctors/pending");
    return response.data;
  }

  static async getAllDoctors(status?: string): Promise<AdminDoctor[]> {
    const response = await api.get("admin/doctors", { params: status ? { status } : undefined });
    return response.data;
  }

  static async reviewDoctor(
    doctorId: number,
    decision: DoctorDecision,
    comment?: string,
  ): Promise<boolean> {
    try {
      await api.patch(
        `admin/doctors/${doctorId}/verify`,
        { decision, comment },
        { withCredentials: true },
      );
      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("Doctor not found!");
        }
        if (typeof error.response.data === "string") {
          throw new Error(error.response.data);
        }
      }
      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }

  static async getAllUsers(): Promise<AdminUser[]> {
    const response = await api.get("admin/users");
    return response.data;
  }

  static async setUserActive(userId: string, isActive: boolean): Promise<boolean> {
    try {
      await api.patch(
        `admin/users/${userId}/active`,
        { isActive },
        { withCredentials: true },
      );
      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("User not found!");
        }
      }
      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }

  static async getAppointments(): Promise<AdminAppointment[]> {
    const response = await api.get("admin/appointments");
    return response.data;
  }

  static async getChatSessions(): Promise<AdminChatSession[]> {
    const response = await api.get("admin/chats");
    return response.data;
  }

  static async getChatMessages(sessionId: number): Promise<AdminChatMessage[]> {
    const response = await api.get(`admin/chats/${sessionId}/messages`);
    return response.data;
  }
}
