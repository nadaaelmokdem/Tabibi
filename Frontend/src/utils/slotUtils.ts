import type { DoctorListItem } from "../types/public";
import type { AvailableSlot } from "../types/appointment";
import type { SlotWithMeta, WeekDay, SelectedSlot } from "../types/booking";
import AppointmentService from "../services/appointmentService";
import { USE_MOCK_DATA } from "../config/apiConfig";
import { formatTimeTo12Hour } from "./dateUtils";

const SLOT_DURATION_MINS = 30;

/** Stable key: doctorId|YYYY-MM-DD|HH:mm */
export function makeSlotKey(
  doctorId: number,
  dateKey: string,
  timeLabel: string,
): string {
  return `${doctorId}|${dateKey}|${timeLabel}`;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function combineDateAndTime(date: Date, timeLabel: string): Date {
  const cleanLabel = timeLabel.trim();
  const isPM = cleanLabel.toUpperCase().includes("PM");
  const isAM = cleanLabel.toUpperCase().includes("AM");
  
  const timeOnly = cleanLabel.replace(/(AM|PM)/i, "").trim();
  const [hoursStr, minutesStr] = timeOnly.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

export function getWeekDays(weekStart: Date): WeekDay[] {
  const todayKey = formatDateKey(new Date());
  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dateKey = formatDateKey(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    days.push({
      date,
      dateKey,
      dayName: getDayName(date),
      shortLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      isToday: dateKey === todayKey,
      isPast: endOfDay < new Date(),
    });
  }

  return days;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapApiSlot(
  slot: AvailableSlot,
  doctorId: number,
  bookedSlots: Set<string>,
): SlotWithMeta {
  const startDate = new Date(slot.start);
  const dateKey = formatDateKey(startDate);
  const timeLabel = formatTimeTo12Hour(startDate);
  const slotKey = makeSlotKey(doctorId, dateKey, timeLabel);
  const isPast = startDate < new Date();

  let status: SlotWithMeta["status"] = "available";
  if (isPast) status = "unavailable";
  else if (bookedSlots.has(slotKey)) status = "booked";
  else if (!slot.isAvailable) status = "booked";

  return {
    ...slot,
    timeLabel,
    slotKey,
    status,
    isAvailable: status === "available",
  };
}

/** Generates mock slots (10:00–17:30) for UI demo when API is unavailable */
export function buildMockSlotsForDay(
  doctor: DoctorListItem,
  date: Date,
  bookedSlots: Set<string>,
): SlotWithMeta[] {
  const dateKey = formatDateKey(date);

  const timeLabels = Array.from({ length: 16 }, (_, i) => {
    const totalMinutes = 10 * 60 + i * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const now = new Date();

  return timeLabels.map((tLabel, index) => {
    const start = combineDateAndTime(date, tLabel);
    const end = addMinutes(start, SLOT_DURATION_MINS);
    const formattedLabel = formatTimeTo12Hour(tLabel);
    const slotKey = makeSlotKey(doctor.doctorId, dateKey, formattedLabel);
    const isPast = start < now;
    const isBooked = bookedSlots.has(slotKey);

    let status: SlotWithMeta["status"] = "available";

    if (isPast) {
      status = "unavailable";
    } else if (isBooked) {
      status = "booked";
    } else {
      // Deterministic demo pattern: every 3rd booked, every 7th unavailable
      if (index % 3 === 0) status = "booked";
      else if (index % 7 === 0) status = "unavailable";
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      isAvailable: status === "available",
      price: null,
      timeLabel: formattedLabel,
      slotKey,
      status,
    };
  });
}

/**
 * Loads slots for a given day.
 * Uses the real API by default; falls back to mock data when USE_MOCK_DATA is true
 * or when the API call fails.
 */
export async function loadSlotsForDay(
  doctor: DoctorListItem,
  date: Date,
  bookedSlots: Set<string>,
): Promise<SlotWithMeta[]> {
  const dateKey = formatDateKey(date);

  if (!USE_MOCK_DATA) {
    try {
      const apiSlots = await AppointmentService.getAvailableSlots(
        doctor.doctorId,
        dateKey,
      );
      return apiSlots.map((s) => mapApiSlot(s, doctor.doctorId, bookedSlots));
    } catch {
      // Fall back to mock schedule on API failure
    }
  }

  await new Promise((r) => setTimeout(r, 350));
  return buildMockSlotsForDay(doctor, date, bookedSlots);
}

export function findAlternativeSlots(
  slots: SlotWithMeta[],
  rejectedKey: string,
  count = 3,
): SlotWithMeta[] {
  return slots
    .filter((s) => s.status === "available" && s.slotKey !== rejectedKey)
    .slice(0, count);
}

export function toSelectedSlot(
  doctorId: number,
  slot: SlotWithMeta,
  dateKey: string,
): SelectedSlot {
  return {
    doctorId,
    date: dateKey,
    start: slot.start,
    end: slot.end,
    timeLabel: slot.timeLabel,
    slotKey: slot.slotKey,
  };
}
