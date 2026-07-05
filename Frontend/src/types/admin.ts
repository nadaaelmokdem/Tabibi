export interface AdminDoctor {
  doctorId: number;
  userId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  clinicLocation: string;
  yearsOfExperience: number;
  verificationStatus: "Pending" | "Approved" | "Rejected" | "NeedsChanges";
  adminComment?: string;
  reviewedAt?: string;
  isActive: boolean;
}

export type DoctorDecision = "Approved" | "Rejected" | "NeedsChanges";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  totalSpent?: number;
}

export interface AdminAppointment {
  appointmentId: number;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  consultationType: string;
  status: string;
  price: number;
  paymentStatus?: string;
  amountPaid?: number;
}

export interface AdminChatSession {
  sessionId: number;
  patientName: string;
  doctorName: string;
  status: string;
  messageCount: number;
  startedAt: string;
  endedAt?: string;
}

export interface AdminChatMessage {
  messageId: number;
  sessionId: number;
  senderRole: string;
  senderName: string;
  content: string;
  sentAt: string;
}
