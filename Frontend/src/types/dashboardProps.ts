import type { Dispatch, SetStateAction } from "react";
import type { ElementType } from "react";
import type { ChatMessage, ScheduleItem } from "./DoctorDashboard";

export interface Appointment {
  id: number | string;
  time: string;
  duration: string;
  patientName: string;
  type: string;
  method: "Video" | "In-Person" | string;
  isActive: boolean;
  avatar?: string;
  initials?: string;
}

export interface AppointmentsListProps {
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
}

export interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem[];
  onCancelAppointment: (id: number) => void;
}

export interface MessagesListProps {
  messages: ChatMessage[];
  onMessageClick: (id: number) => void;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  icon: ElementType;
  isPrimary?: boolean;
}
