export interface UpcomingAppointment {
  appointmentId: number;
  doctorName: string;
  patientName?: string;
  scheduledAt: string;
  consultationType: string;
  status: string;
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
  scheduledAt: string;
}

export interface PatientDashboardData {
  fullName: string;
  upcomingAppointmentsCount: number;
  chatSessionsCount: number;
  upcomingAppointments: UpcomingAppointment[];
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
  todaysAppointmentsCount: number;
  totalPatientsSeen: number;
  chatSessions: ChatSession[];
  todaysAppointments: UpcomingAppointment[];
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
