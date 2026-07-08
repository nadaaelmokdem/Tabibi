import api from "./api";
import type {
  AvailableSlot,
  AppointmentBooked,
  BookAppointmentRequest,
  ConsultationType,
} from "../types/appointment";

export default class AppointmentService {
  static async getAvailableSlots(
    doctorId: number,
    date: string,
    type?: ConsultationType,
  ): Promise<AvailableSlot[]> {
    const response = await api.get<AvailableSlot[]>("appointment/available-slots", {
      params: { doctorId, date, type },
    });
    return (response.data as any)?.data ?? response.data;
  }

  static async bookAppointment(
    request: BookAppointmentRequest,
  ): Promise<AppointmentBooked> {
    const response = await api.post<AppointmentBooked>(
      "appointment/book",
      request,
    );
    return (response.data as any)?.data ?? response.data;
  }
}
