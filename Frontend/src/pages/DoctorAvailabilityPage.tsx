import { useState, useEffect } from "react";
import { MdAdd, MdDelete, MdContentCopy, MdSave, MdCalendarMonth, MdSchedule, MdInfo } from "react-icons/md";
import { LuCalendarDays, LuClock } from "react-icons/lu";
import DoctorService from "../services/doctorService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface AvailabilitySlot {
  id?: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  isActive: boolean;
  specificDate?: string | null; // ISO date string "YYYY-MM-DD"
}

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

type ActiveTab = "weekly" | "specific";

export default function DoctorAvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(1); // Monday default
  const [activeTab, setActiveTab] = useState<ActiveTab>("weekly");
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  useEffect(() => {
    fetchAvailabilities();
  }, []);

  const fetchAvailabilities = async () => {
    try {
      const data = await DoctorService.getAvailability();

      // The backend uses JsonStringEnumConverter, so DayOfWeek arrives as e.g. "Monday".
      // We map it back to its numeric value to match the frontend's selectedDay number.
      const DAY_NAME_TO_NUM: Record<string, number> = {
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
        Thursday: 4, Friday: 5, Saturday: 6,
      };

      const normalised = data.map((a: any) => ({
        ...a,
        dayOfWeek: typeof a.dayOfWeek === "string"
          ? (DAY_NAME_TO_NUM[a.dayOfWeek] ?? a.dayOfWeek)
          : a.dayOfWeek,
        specificDate: a.specificDate ? a.specificDate.split("T")[0] : null,
      }));
      setAvailabilities(normalised);
    } catch {
      toast.error("Failed to load availability.");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    for (const slot of availabilities) {
      if (slot.slotDurationMins <= 0) {
        toast.error("Slot duration must be greater than 0 minutes.");
        return false;
      }
      const start = new Date(`1970-01-01T${slot.startTime}:00`);
      const end = new Date(`1970-01-01T${slot.endTime}:00`);
      if (start >= end) {
        const label = slot.specificDate
          ? format(new Date(slot.specificDate + "T00:00:00"), "MMM d, yyyy")
          : DAYS.find((d) => d.value === slot.dayOfWeek)?.label;
        toast.error(`Invalid times for ${label}: Start time must be before end time.`);
        return false;
      }
    }
    // Check for specific dates in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const slot of availabilities.filter((a) => a.specificDate)) {
      const d = new Date(slot.specificDate! + "T00:00:00");
      if (d < today) {
        toast.error(`Specific date ${format(d, "MMM d, yyyy")} is in the past.`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Map specificDate → the backend expects it as a full ISO datetime or null
      const payload = availabilities.map((a) => ({
        ...a,
        specificDate: a.specificDate ? new Date(a.specificDate + "T00:00:00").toISOString() : null,
      }));
      await DoctorService.updateAvailability(payload);
      toast.success("Availability updated successfully!");
      fetchAvailabilities();
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to update. Check for overlapping times or existing appointments."
      );
    } finally {
      setSaving(false);
    }
  };

  const addWeeklySlot = () => {
    setAvailabilities([
      ...availabilities,
      { dayOfWeek: selectedDay, startTime: "09:00", endTime: "17:00", slotDurationMins: 30, isActive: true, specificDate: null },
    ]);
  };

  const addSpecificSlot = () => {
    const date = new Date(selectedSpecificDate + "T00:00:00");
    const dow = date.getDay() as DayOfWeek;
    setAvailabilities([
      ...availabilities,
      { dayOfWeek: dow, startTime: "09:00", endTime: "17:00", slotDurationMins: 30, isActive: true, specificDate: selectedSpecificDate },
    ]);
  };

  const removeSlot = (index: number) => {
    const n = [...availabilities];
    n.splice(index, 1);
    setAvailabilities(n);
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const n = [...availabilities];
    n[index] = { ...n[index], [field]: value };
    setAvailabilities(n);
  };

  const applyToAllDays = () => {
    const source = availabilities.filter((a) => !a.specificDate && a.dayOfWeek === selectedDay);
    if (source.length === 0) {
      toast.info(`No weekly slots to copy for ${DAYS.find((d) => d.value === selectedDay)?.label}.`);
      return;
    }
    const withoutOtherWeekly = availabilities.filter((a) => a.specificDate || a.dayOfWeek === selectedDay);
    const copies: AvailabilitySlot[] = [];
    DAYS.forEach((day) => {
      if (day.value === selectedDay) return;
      source.forEach((slot) => {
        copies.push({ ...slot, id: undefined, dayOfWeek: day.value as DayOfWeek });
      });
    });
    setAvailabilities([...withoutOtherWeekly, ...copies]);
    toast.success("Schedule copied to all days. Don't forget to save!");
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-[#6A5ACD]">
        <LuClock className="animate-spin text-xl" />
        Loading your schedule...
      </div>
    );
  }

  const weeklySlots = availabilities
    .map((a, i) => ({ ...a, originalIndex: i }))
    .filter((a) => !a.specificDate && a.dayOfWeek === selectedDay);

  const specificSlots = availabilities
    .map((a, i) => ({ ...a, originalIndex: i }))
    .filter((a) => a.specificDate === selectedSpecificDate);

  // Count specific date slots grouped by date
  const specificDates = Array.from(
    new Set(availabilities.filter((a) => a.specificDate).map((a) => a.specificDate!))
  ).sort();

  return (
    <div className="w-full bg-[#FBFAFF] p-4 md:p-8 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2A2455]">Availability Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Control your working hours. Specific date rules always override weekly patterns.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-[#6A5ACD] text-white rounded-xl font-semibold shadow-md hover:bg-[#5140b3] transition-all disabled:opacity-50 active:scale-95"
          >
            <MdSave size={20} />
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-[#F0EEFF] border border-[#D0C9FF] rounded-xl text-sm text-[#5140b3]">
          <MdInfo size={18} className="shrink-0 mt-0.5" />
          <p>
            <strong>Tip:</strong> Use <em>Weekly Schedule</em> to set repeating hours (e.g. every Monday 9–5). Use{" "}
            <em>Specific Dates</em> to override those hours on a particular day — for example, a short day before a holiday.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#E6E1FF] shadow-sm w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === "weekly"
                ? "bg-[#6A5ACD] text-white shadow-md"
                : "text-gray-500 hover:text-[#6A5ACD] hover:bg-[#F8F7FF]"
            }`}
          >
            <LuCalendarDays size={16} />
            Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab("specific")}
            className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === "specific"
                ? "bg-[#6A5ACD] text-white shadow-md"
                : "text-gray-500 hover:text-[#6A5ACD] hover:bg-[#F8F7FF]"
            }`}
          >
            <MdCalendarMonth size={16} />
            Specific Dates
            {specificDates.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "specific" ? "bg-white/30" : "bg-[#6A5ACD] text-white"}`}>
                {specificDates.length}
              </span>
            )}
          </button>
        </div>

        {/* ── WEEKLY TAB ── */}
        {activeTab === "weekly" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Days Sidebar – horizontal scroll on mobile, vertical on md+ */}
            <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-[#E6E1FF] overflow-hidden">
              <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible">
              {DAYS.map((day) => {
                const count = availabilities.filter((a) => !a.specificDate && a.dayOfWeek === day.value).length;
                const active = selectedDay === day.value;
                return (
                  <button
                    key={day.value}
                    onClick={() => setSelectedDay(day.value as DayOfWeek)}
                    className={`cursor-pointer px-4 py-3 text-left border-b md:border-b border-r md:border-r-0 border-gray-50 last:border-0 transition-all flex-shrink-0 md:flex-shrink flex justify-between items-center gap-2 border-l-0 md:border-l-4 border-b-2 md:border-b-0 ${
                      active
                        ? "bg-[#F8F7FF] md:border-l-[#6A5ACD] border-b-[#6A5ACD] text-[#6A5ACD] font-bold"
                        : "hover:bg-gray-50 text-gray-600 font-medium md:border-l-transparent"
                    }`}
                  >
                    <span className="text-sm">{day.short}</span>
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? "bg-[#6A5ACD] text-white" : "bg-[#E6E1FF] text-[#6A5ACD]"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
            </div>

            {/* Slots Panel */}
            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-[#E6E1FF] p-6 min-h-[400px]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#2A2455]">{DAYS.find((d) => d.value === selectedDay)?.label}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Repeats every week on this day</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={applyToAllDays}
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#6A5ACD] bg-[#F8F7FF] rounded-xl hover:bg-[#E6E1FF] transition-colors border border-[#E6E1FF] whitespace-nowrap"
                    title="Copy this day's schedule to all other days"
                  >
                    <MdContentCopy size={15} /> Apply to all
                  </button>
                  <button
                    onClick={addWeeklySlot}
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#6A5ACD] rounded-xl hover:bg-[#5140b3] transition-colors shadow-sm whitespace-nowrap"
                  >
                    <MdAdd size={16} /> Add Slot
                  </button>
                </div>
              </div>
              <SlotList slots={weeklySlots} onUpdate={updateSlot} onRemove={removeSlot} />
            </div>
          </div>
        )}

        {/* ── SPECIFIC DATES TAB ── */}
        {activeTab === "specific" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Date Picker Sidebar */}
            <div className="md:col-span-1 flex flex-col gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-[#E6E1FF] p-4 space-y-3">
                <label className="block text-xs font-bold text-[#6A5ACD] uppercase tracking-wider">Pick a Date</label>
                <input
                  type="date"
                  value={selectedSpecificDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setSelectedSpecificDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F7FF] border border-[#E6E1FF] rounded-xl text-sm text-[#2A2455] font-medium focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20"
                />
                <button
                  onClick={addSpecificSlot}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#6A5ACD] rounded-xl hover:bg-[#5140b3] transition-colors shadow-sm"
                >
                  <MdAdd size={16} /> Add Slot for This Day
                </button>
              </div>

              {/* List of dates with overrides */}
              {specificDates.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#E6E1FF] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overrides Set</p>
                  </div>
                  {specificDates.map((date) => {
                    const count = availabilities.filter((a) => a.specificDate === date).length;
                    const active = date === selectedSpecificDate;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedSpecificDate(date)}
                        className={`cursor-pointer w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-all flex justify-between items-center border-l-4 ${
                          active
                            ? "bg-[#F8F7FF] border-l-[#6A5ACD] text-[#6A5ACD] font-bold"
                            : "hover:bg-gray-50 text-gray-600 font-medium border-l-transparent"
                        }`}
                      >
                        <div>
                          <div className="text-sm">{format(new Date(date + "T00:00:00"), "MMM d")}</div>
                          <div className="text-[11px] opacity-60">{format(new Date(date + "T00:00:00"), "EEEE, yyyy")}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? "bg-[#6A5ACD] text-white" : "bg-[#E6E1FF] text-[#6A5ACD]"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slots Panel */}
            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-[#E6E1FF] p-6 min-h-[400px]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-[#2A2455] break-words">
                    {format(new Date(selectedSpecificDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                  </h2>
                  <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                    <MdInfo size={13} />
                    These slots will override the weekly schedule for this specific date only.
                  </p>
                </div>
              </div>
              <div className="mb-6" />
              <SlotList slots={specificSlots} onUpdate={updateSlot} onRemove={removeSlot} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable slot row list ── */
function SlotList({
  slots,
  onUpdate,
  onRemove,
}: {
  slots: (AvailabilitySlot & { originalIndex: number })[];
  onUpdate: (index: number, field: keyof AvailabilitySlot, value: any) => void;
  onRemove: (index: number) => void;
}) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <MdSchedule size={40} className="opacity-30" />
        <p className="font-medium">No slots configured</p>
        <p className="text-sm">Click "Add Slot" to create a time block.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {slots.map((slot, idx) => (
        <div
          key={idx}
          className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${
            slot.isActive
              ? "border-[#E6E1FF] bg-[#FAFAFF]"
              : "border-gray-100 bg-gray-50 opacity-60"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Time</label>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => onUpdate(slot.originalIndex, "startTime", e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Time</label>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => onUpdate(slot.originalIndex, "endTime", e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Slot Duration</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={slot.slotDurationMins}
                  onChange={(e) => onUpdate(slot.originalIndex, "slotDurationMins", parseInt(e.target.value) || 30)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">min</span>
              </div>
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => onUpdate(slot.originalIndex, "isActive", !slot.isActive)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${slot.isActive ? "bg-[#6A5ACD]" : "bg-gray-300"}`}
                  style={{ height: "22px", minWidth: "40px" }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.isActive ? "translate-x-[18px]" : "translate-x-0"}`}
                  />
                </div>
                <span className={`text-sm font-medium ${slot.isActive ? "text-[#6A5ACD]" : "text-gray-400"}`}>
                  {slot.isActive ? "Active" : "Off"}
                </span>
              </label>
            </div>
          </div>
          <button
            onClick={() => onRemove(slot.originalIndex)}
            className="cursor-pointer self-end p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Remove this slot"
          >
            <MdDelete size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
