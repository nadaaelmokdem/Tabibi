export interface UpcomingAppointment {
  appointmentId: number;
  doctorName: string;
  patientName?: string;
  scheduledAt: string;
  doctorProfilePictureUrl?: string;
  consultationType: string;
  status: string;
  paymentMethod?: string;
  sessionId?: number;
}

export interface RecentPrescription {
  prescriptionId: number;
  doctorName: string;
  issuedAt: string;
  diagnosis?: string;
}

export interface UnreviewedAppointment {
  appointmentId: number;
  doctorId: number;
  doctorName: string;
  doctorProfilePictureUrl?: string;
  scheduledAt: string;
}

export interface PatientDashboardData {
  fullName: string;
  activeConsultationsCount: number;
  chatSessionsCount: number;
  activeConsultations: UpcomingAppointment[];
  recentPrescriptions: RecentPrescription[];
  unreviewedAppointments: UnreviewedAppointment[];
}

export interface ChatSession {
  sessionId: number;
  patientName: string;
  sessionSummary?: string;
  startedAt: string;
}

export interface DoctorDashboardData {
  fullName: string;
  isVerified: boolean;
  verificationStatus?: "Pending" | "Approved" | "Rejected" | "NeedsChanges";
  adminComment?: string;
  chatSessionsCount: number;
  activeConsultationsCount: number;
  totalPatientsSeen: number;
  chatSessions: ChatSession[];
  activeConsultations: UpcomingAppointment[];
}

export interface PendingDoctor {
  userId: string;
  doctorId: number;
  fullName: string;
  licenseNumber: string;
  clinicLocation: string;
}

export interface AdminDashboardData {
  totalPatients: number;
  totalDoctors: number;
  pendingDoctorVerifications: number;
  totalAppointments: number;
  pendingDoctors: PendingDoctor[];
}
