import { isAxiosError } from "axios";
import api from "./api";
import type { AdminDashboardData, PendingDoctor } from "../types/dashboard";
import type {
  AdminDoctor,
  DoctorDecision,
  AdminUser,
  AdminAppointment,
  AdminDoctorDetail,
  DoctorProfileChangeLog,
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
    revertToOldData: boolean = false,
    banDoctor: boolean = false
  ): Promise<boolean> {
    try {
      await api.patch(
        `admin/doctors/${doctorId}/verify`,
        { decision, comment, revertToOldData, banDoctor },
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

  static async getDoctorDetail(doctorId: number): Promise<AdminDoctorDetail> {
    const response = await api.get(`admin/doctors/${doctorId}`);
    return response.data;
  }

  static async getDoctorChanges(doctorId: number): Promise<DoctorProfileChangeLog[]> {
    const response = await api.get(`admin/doctors/${doctorId}/changes`);
    return response.data;
  }

}
