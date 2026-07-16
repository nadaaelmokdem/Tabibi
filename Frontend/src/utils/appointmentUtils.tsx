/* eslint-disable react-refresh/only-export-components */
import {
  MdAccessTime,
  MdLocalHospital,
  MdVideocam,
  MdChat,
  MdCircle,
} from "react-icons/md";
import type { ReactNode } from "react";

export type ConsultationTypeName = "Chat" | "Video" | "Clinic";
export type AppointmentStatusName = "Confirmed" | "Completed" | "Cancelled";

export interface AppointmentListItem {
  appointmentId: number;
  doctorId?: number;
  doctorName?: string;
  patientName?: string;
  scheduledAt: string;
  consultationType: ConsultationTypeName | string;
  status: AppointmentStatusName | string;
  durationMins: number;
  price?: number;
  notes?: string;
  doctorProfilePictureUrl?: string;
  patientProfilePictureUrl?: string;
  sessionId?: number;
  paymentMethod?: number | string;
}

export const CONSULTATION_TYPE_OPTIONS = [
  { value: "", label: "All", icon: <MdAccessTime size={13} /> },
  { value: "Chat", label: "Chat", icon: <MdChat size={13} /> },
  { value: "Video", label: "Video", icon: <MdVideocam size={13} /> },
  { value: "Clinic", label: "Clinic", icon: <MdLocalHospital size={13} /> },
] as const;

export const STATUS_OPTIONS = [
  { value: "", label: "All", color: "text-gray-400" },
  { value: "Confirmed", label: "Confirmed", color: "text-green-500" },
  { value: "Completed", label: "Completed", color: "text-blue-500" },
  { value: "Cancelled", label: "Cancelled", color: "text-red-500" },
] as const;

export function getConsultationTypeLabel(type: string | number): string {
  if (type === "VideoCall") return "Video";
  if (typeof type === "string" && type) return type;
  const labelMap = ["Chat", "Video", "Clinic"];
  return typeof type === "number" && type >= 0 && type < labelMap.length
    ? labelMap[type]
    : "—";
}

export function getStatusLabel(status: string | number): string {
  if (typeof status === "string" && status) return status;
  const statusMap = ["Pending", "Confirmed", "Completed", "Cancelled"];
  return typeof status === "number" && status >= 0 && status < statusMap.length
    ? statusMap[status]
    : "—";
}

export function isChatConsultation(type: string | number): boolean {
  return type === "Chat" || type === 0;
}

export function isVideoConsultation(type: string | number): boolean {
  return type === "Video" || type === "VideoCall" || type === 1;
}

export function getConsultationTypeIcon(type: string | number, size = 13): ReactNode {
  switch (getConsultationTypeLabel(type)) {
    case "Chat":
      return <MdChat size={size} />;
    case "Video":
      return <MdVideocam size={size} />;
    case "Clinic":
      return <MdLocalHospital size={size} />;
    default:
      return <MdLocalHospital size={size} />;
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

export function canCancelAppointment(status: string | number, paymentMethod?: string | number): boolean {
  const name = getStatusLabel(status);
  return name === "Confirmed" && (paymentMethod === 2 || paymentMethod === "OnSite");
}

export { MdCircle };
