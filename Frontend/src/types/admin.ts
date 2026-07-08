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
  pendingChangesCount?: number;
  lastChangedAt?: string;
}

export interface AdminDoctorDetail {
  doctorId: number;
  userId: string;
  fullName: string;
  email: string;
  licenseNumber?: string;
  nationalIdNumber?: string;
  clinicLocation?: string;
  clinicPhoneNumber?: string;
  licenseProofUrl?: string;
  idProofUrl?: string;
  degreeProofUrl?: string;
  licenseExpiryDate?: string;
  yearsOfExperience?: number;
  bio?: string;
  verificationStatus: AdminDoctor["verificationStatus"];
  adminComment?: string;
  reviewedAt?: string;
  specialties: { specialtyId: number; name: string }[];
  oldLicenseNumber?: string;
  oldNationalIdNumber?: string;
  oldLicenseProofUrl?: string;
  oldIdProofUrl?: string;
  oldDegreeProofUrl?: string;
  oldLicenseExpiryDate?: string;
  oldSpecialties?: { specialtyId: number; name: string }[];
}

export interface DoctorProfileChangeLog {
  changeLogId: number;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedAt: string;
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

