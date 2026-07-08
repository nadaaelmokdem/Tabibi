import { isAxiosError } from "axios";
import type { DoctorDashboardData } from "../types/dashboard";
import api from "./api";
import type { DoctorProfileData } from "../types/profilePageProps";

export default class DoctorService {
  static async updateProfileField(
    fieldName: string,
    value: string,
  ): Promise<boolean> {
    try {
      await api.patch(
        "doctor/profile-field",
        { fieldName, value },
        { withCredentials: true },
      );

      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("User not found!");
        } else if (error.response.status === 400) {
          throw new Error(typeof error.response.data === "string" ? error.response.data : "Invalid data provided!");
        }
      }

      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }

  static async uploadProof(file: File, fieldName: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fieldName", fieldName);

    try {
      const response = await api.post("doctor/upload-proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      return response.data.url;
    } catch (error: unknown) {
      console.error("Failed to upload proof:", error);
      throw new Error("Failed to upload file.");
    }
  }

  static async bulkUpdateProfile(profileData: any): Promise<void> {
    await api.put("doctor/profile", profileData, { withCredentials: true });
  }

  static async getProfile(): Promise<DoctorProfileData> {
    const response = await api.get("doctor/profile");
    return response.data;
  }
   static async getDashboard(): Promise<DoctorDashboardData> {
    const response = await api.get("doctor/dashboard-summary");
    return response.data;
  }

  static async getSpecialties(): Promise<{ specialtyId: number; name: string }[]> {
    const response = await api.get("specialties");
    return response.data;
  }

  static async getAvailability(): Promise<any[]> {
    const response = await api.get("doctor/availability");
    return response.data;
  }

  static async updateAvailability(availabilities: any[]): Promise<void> {
    await api.put("doctor/availability", { availabilities }, { withCredentials: true });
  }

  static async getAppointments(filters: any = {}): Promise<any[]> {
    const response = await api.get("appointment/doctor-appointments", { params: filters });
    return response.data;
  }
}
