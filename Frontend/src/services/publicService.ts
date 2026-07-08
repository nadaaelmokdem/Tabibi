import api from "./api";
import type { DoctorSearchFilter, PaginatedResult, DoctorListItem } from "../types/public";

export default class PublicService {
  static async getDoctors(filter: DoctorSearchFilter): Promise<PaginatedResult<DoctorListItem>> {
    try {
      const response = await api.get("public/doctors", {
        params: filter
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
      throw new Error("Failed to fetch doctors.");
    }
  }

  static async getDoctorById(id: number | string): Promise<DoctorListItem> {
    try {
      const response = await api.get(`public/doctors/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch doctor details:", error);
      throw new Error("Failed to fetch doctor details.");
    }
  }

  static async getSpecialties(): Promise<{ specialtyId: number; name: string }[]> {
    try {
      const response = await api.get("specialties");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch specialties:", error);
      return [];
    }
  }

  static async getDoctorReviews(doctorId: number | string, page: number = 1, pageSize: number = 10): Promise<PaginatedResult<any>> {
    try {
      const response = await api.get(`reviews/doctor/${doctorId}`, {
        params: { page, pageSize }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch doctor reviews:", error);
      throw new Error("Failed to fetch doctor reviews.");
    }
  }
}
