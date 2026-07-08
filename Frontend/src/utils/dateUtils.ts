export const getTodayStr = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const checkIsToday = (
  day: number,
  month: number,
  year: number,
): boolean => {
  const today = new Date();
  return (
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  );
};

export const filterEventsForDay = <T extends { date: string }>(
  day: number,
  month: number,
  year: number,
  schedule: T[],
): T[] => {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return schedule.filter((item) => item.date === dateStr);
};

export const parseTime = (timeStr: string): number => {
  const [time, modifier] = timeStr.split(" ");
  const [hours, minutes] = time.split(":");
  let adjustedHours = hours;
  if (adjustedHours === "12") adjustedHours = "00";
  if (modifier === "PM")
    adjustedHours = String(parseInt(adjustedHours, 10) + 12);
  return parseInt(adjustedHours, 10) * 60 + parseInt(minutes, 10);
};

export const sortSchedule = <T extends { date: string; time: string }>(
  schedule: T[],
): T[] => {
  return [...schedule].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return parseTime(a.time) - parseTime(b.time);
  });
};

export const formatTimeTo12Hour = (time: Date | string): string => {
  if (time instanceof Date) {
    let hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }

  if (typeof time === "string") {
    if (time.includes("AM") || time.includes("PM")) {
      return time;
    }
    if (time.includes("T")) {
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return formatTimeTo12Hour(date);
      }
    }
    const parts = time.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].substring(0, 2);
      if (!isNaN(hours)) {
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
      }
    }
  }
  return String(time);
};

