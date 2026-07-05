export interface UpcomingAppointment {
  appointmentId: number;
  doctorName: string;
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

export interface PatientDashboardData {
  fullName: string;
  upcomingAppointmentsCount: number;
  pendingChatSessionsCount: number;
  upcomingAppointments: UpcomingAppointment[];
  recentPrescriptions: RecentPrescription[];
}

export interface PendingChatRequest {
  sessionId: number;
  patientName: string;
  sessionSummary?: string;
  startedAt: string;
}

export interface DoctorDashboardData {
  fullName: string;
  isVerified: boolean;
  pendingChatRequestsCount: number;
  todaysAppointmentsCount: number;
  totalPatientsSeen: number;
  pendingChatRequests: PendingChatRequest[];
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
