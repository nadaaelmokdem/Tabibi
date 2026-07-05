import { isAxiosError } from "axios";
import type { PatientDashboardData } from "../types/dashboard";
import api from "./api";
import type patientExtraData from "../types/extraDataPatient";
import type { PatientProfileResponse } from "../types/patientProfileResponse";

export default class PatientService {
  static async updatePatientData(data: patientExtraData): Promise<boolean> {
    try {
      await api.put("patient/change-patient-data", data, {
        withCredentials: true,
      });

      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("User not found!");
        } else if (error.response.status === 400) {
          throw new Error("Invalid data provided!");
        }
      }

      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }

  static async updateProfileField(
    fieldName: string,
    value: string,
  ): Promise<boolean> {
    try {
      await api.patch(
        "patient/profile-field",
        { fieldName, value },
        { withCredentials: true },
      );

      return true;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          throw new Error("User not found!");
        } else if (error.response.status === 400) {
          throw new Error("Invalid data provided!");
        }
      }

      console.error("An unexpected error occurred:", error);
      throw new Error("An unexpected error occurred.");
    }
  }

  static async getProfile(): Promise<PatientProfileResponse> {
    const response = await api.get("patient/profile");
    return response.data;
  }
  static async getDashboard(): Promise<PatientDashboardData> {
    const response = await api.get("patient/dashboard-summary");
    return response.data;
  }
}
