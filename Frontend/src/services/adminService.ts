import { isAxiosError } from "axios";
import api from "./api";
import type { AdminDashboardData, PendingDoctor } from "../types/dashboard";

export default class AdminService {
  static async getDashboard(): Promise<AdminDashboardData> {
    const response = await api.get("admin/dashboard-summary");
    return response.data;
  }

  static async getPendingDoctors(): Promise<PendingDoctor[]> {
    const response = await api.get("admin/doctors/pending");
    return response.data;
  }

  static async verifyDoctor(doctorId: number, approve: boolean): Promise<boolean> {
    try {
      await api.patch(`admin/doctors/${doctorId}/verify`, approve, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("Doctor not found!");
        }
      }
      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }
}
