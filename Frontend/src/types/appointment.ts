export interface AvailableSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  price?: number | null;
}

export interface BookAppointmentRequest {
  doctorId: number;
  scheduledAt: string;
  type: ConsultationType;
}

export interface AppointmentBooked {
  appointmentId: number;
  doctorId: number;
  scheduledAt: string;
  consultationType: ConsultationType;
  status: string;
  durationMins: number;
  price: number;
  paymentUrl?: string;
}

/** Matches backend ConsultationType enum: Chat=0, VideoCall=1, Clinic=2 */
export type ConsultationType = 0 | 1 | 2;

export const ConsultationType = {
  Chat: 0,
  VideoCall: 1,
  Clinic: 2,
} as const;
