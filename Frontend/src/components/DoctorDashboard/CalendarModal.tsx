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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#2A2455]/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-3">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="font-bold text-lg text-[#2A2455] bg-transparent outline-none cursor-pointer"
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
                className="font-bold text-lg text-[#2A2455] bg-transparent outline-none cursor-pointer"
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
              className="bg-gray-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500"
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center text-[10px] font-black mb-4 text-[#B8A7FF] uppercase tracking-widest">
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
                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl cursor-pointer text-sm font-bold transition-all relative ${
                      selectedDay === day
                        ? "bg-[#6A5ACD] text-white shadow-lg scale-105"
                        : isToday
                          ? "border-2 border-[#6A5ACD] text-[#6A5ACD]"
                          : "bg-[#FBFAFF] text-[#2A2455] hover:bg-[#E6E1FF]"
                    }`}
                  >
                    {day}
                    {hasEvents && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${selectedDay === day ? "bg-white" : "bg-[#6A5ACD]"}`}
                      ></div>
                    )}
                  </div>

                  {hoveredDay === day && hasEvents && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-[#2A2455] text-white p-3 rounded-xl shadow-xl z-[1001] pointer-events-none text-[10px] animate-in fade-in zoom-in">
                      <p className="font-bold border-b border-white/10 pb-1 mb-1 italic">
                        Daily Summary:
                      </p>
                      {dayEvents.map((ev) => (
                        <div key={ev.id}>• {ev.name}</div>
                      ))}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#2A2455]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-80 bg-[#FBFAFF] border-l border-[#E6E1FF] p-8">
          <h3 className="font-black text-xl text-[#2A2455] mb-6 flex items-center gap-2">
            Details
          </h3>
          <div className="space-y-3">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white p-4 rounded-2xl border border-[#E6E1FF] shadow-sm relative group"
                >
                  <button
                    onClick={() => onCancelAppointment(ev.id)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MdDelete size={14} />
                  </button>
                  <div className="text-[#6A5ACD] font-bold text-xs mb-1 flex items-center gap-1">
                    <MdAccessTime size={12} /> {ev.time}
                  </div>
                  <div className="font-bold text-[#2A2455] text-sm">
                    {ev.name}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {ev.type}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic text-center py-20 text-sm">
                No appointments
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
