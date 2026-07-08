import {
  MdAccessTime,
  MdLocalHospital,
  MdVideocam,
  MdPhone,
  MdChat,
  MdCircle,
} from "react-icons/md";
import type { ReactNode } from "react";

export type ConsultationTypeName = "Chat" | "Video" | "Call" | "Clinic";
export type AppointmentStatusName = "Confirmed" | "Completed" | "Cancelled";

export interface AppointmentListItem {
  appointmentId: number;
  doctorName?: string;
  patientName?: string;
  scheduledAt: string;
  consultationType: ConsultationTypeName | string;
  status: AppointmentStatusName | string;
  durationMins: number;
  price?: number;
  chiefComplaint?: string;
  notes?: string;
  doctorProfilePictureUrl?: string;
  patientProfilePictureUrl?: string;
  sessionId?: number;
}

export const CONSULTATION_TYPE_OPTIONS = [
  { value: "", label: "All", icon: <MdAccessTime size={13} /> },
  { value: "Chat", label: "Chat", icon: <MdChat size={13} /> },
  { value: "Video", label: "Video", icon: <MdVideocam size={13} /> },
  { value: "Call", label: "Call", icon: <MdPhone size={13} /> },
  { value: "Clinic", label: "Clinic", icon: <MdLocalHospital size={13} /> },
] as const;

export const STATUS_OPTIONS = [
  { value: "", label: "All", color: "text-gray-400" },
  { value: "Confirmed", label: "Confirmed", color: "text-green-500" },
  { value: "Completed", label: "Completed", color: "text-blue-500" },
  { value: "Cancelled", label: "Cancelled", color: "text-red-500" },
] as const;

export function getConsultationTypeLabel(type: string | number): string {
  if (typeof type === "string" && type) return type;
  const labels = ["Chat", "Video", "Call", "Clinic"];
  if (typeof type === "number" && type >= 0 && type < labels.length) return labels[type];
  return "—";
}

export function getStatusLabel(status: string | number): string {
  if (typeof status === "string" && status) return status;
  const labels = ["Confirmed", "Completed", "Cancelled"];
  if (typeof status === "number" && status >= 0 && status < labels.length) return labels[status];
  return "—";
}

export function isChatConsultation(type: string | number): boolean {
  return type === "Chat" || type === 0;
}

export function getConsultationTypeIcon(type: string | number, size = 13): ReactNode {
  const name = getConsultationTypeLabel(type);
  switch (name) {
    case "Chat":
      return <MdChat size={size} />;
    case "Video":
      return <MdVideocam size={size} />;
    case "Call":
      return <MdPhone size={size} />;
    case "Clinic":
      return <MdLocalHospital size={size} />;
    default:
      return <MdAccessTime size={size} />;
  }
}

export function getStatusBadgeClasses(status: string | number): string {
  const name = getStatusLabel(status);
  switch (name) {
    case "Confirmed":
      return "bg-green-50 text-green-700 border-green-200";
    case "Completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export function canCancelAppointment(status: string | number): boolean {
  const name = getStatusLabel(status);
  return name === "Confirmed";
}

export { MdCircle };
