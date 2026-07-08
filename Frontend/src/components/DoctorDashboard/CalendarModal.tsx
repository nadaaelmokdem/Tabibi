import { useState } from "react";
import { MdClose, MdAccessTime, MdDelete } from "react-icons/md";

import type { CalendarModalProps } from "../../types/dashboardProps";
import type { ScheduleItem } from "../../types/DoctorDashboard";

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month + 1, 0).getDate();
const checkIsToday = (day: number, month: number, year: number) => {
  const today = new Date();
  return (
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  );
};
const filterEventsForDay = (
  day: number,
  month: number,
  year: number,
  schedule: ScheduleItem[],
) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return schedule.filter((item) => item.date === dateStr);
};
const parseTime = (timeStr: string) => {
  const [time, modifier] = timeStr.split(" ");
  const [hours, minutes] = time.split(":");
  let adjustedHours = hours;
  if (adjustedHours === "12") adjustedHours = "00";
  if (modifier === "PM")
    adjustedHours = String(parseInt(adjustedHours, 10) + 12);
  return parseInt(adjustedHours, 10) * 60 + parseInt(minutes, 10);
};
const sortSchedule = (schedule: ScheduleItem[]) => {
  return [...schedule].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return parseTime(a.time) - parseTime(b.time);
  });
};

export default function CalendarModal({
  isOpen,
  onClose,
  schedule,
  onCancelAppointment,
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  if (!isOpen) return null;

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = Array.from(
    { length: 61 },
    (_, i) => new Date().getFullYear() - 30 + i,
  );
  const daysCount = getDaysInMonth(currentMonth, currentYear);
  const selectedDayEvents = sortSchedule(
    filterEventsForDay(selectedDay, currentMonth, currentYear, schedule),
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl border border-surface-variant/30">
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-3">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="font-bold text-lg text-on-surface bg-transparent outline-none cursor-pointer"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="font-bold text-lg text-on-surface bg-transparent outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onClose}
              className="bg-surface-container-low p-2 rounded-full hover:bg-red-50 hover:text-red-500 cursor-pointer"
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center text-[10px] font-black mb-4 text-primary/60 uppercase tracking-widest">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {[...Array(daysCount)].map((_, i) => {
              const day = i + 1;
              const dayEvents = filterEventsForDay(
                day,
                currentMonth,
                currentYear,
                schedule,
              );
              const hasEvents = dayEvents.length > 0;
              const isToday = checkIsToday(day, currentMonth, currentYear);

              return (
                <div
                  key={i}
                  className="relative"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer text-sm font-bold transition-all relative ${
                      selectedDay === day
                        ? "bg-primary text-on-primary shadow-lg scale-105"
                        : isToday
                          ? "border-2 border-primary text-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-primary/10"
                    }`}
                  >
                    {day}
                    {hasEvents && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${selectedDay === day ? "bg-on-primary" : "bg-primary"}`}
                      ></div>
                    )}
                  </div>

                  {hoveredDay === day && hasEvents && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-on-surface text-on-primary p-3 rounded-xl shadow-xl z-[1001] pointer-events-none text-[10px]">
                      <p className="font-bold border-b border-white/10 pb-1 mb-1 italic">
                        Daily Summary:
                      </p>
                      {dayEvents.map((ev) => (
                        <div key={ev.id}>• {ev.name}</div>
                      ))}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-on-surface"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-80 bg-surface-container-low border-l border-surface-variant/30 p-8">
          <h3 className="font-semibold text-xl text-on-surface mb-6 flex items-center gap-2">
            Details
          </h3>
          <div className="space-y-3">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant/30 shadow-sm relative group"
                >
                  <button
                    onClick={() => onCancelAppointment(ev.id)}
                    className="absolute top-2 right-2 text-on-surface-variant/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <MdDelete size={14} />
                  </button>
                  <div className="text-primary font-bold text-xs mb-1 flex items-center gap-1">
                    <MdAccessTime size={12} /> {ev.time}
                  </div>
                  <div className="font-semibold text-on-surface text-sm">
                    {ev.name}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1">
                    {ev.type}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-on-surface-variant italic text-center py-20 text-sm">
                No appointments
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
