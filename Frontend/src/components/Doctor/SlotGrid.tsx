import React from "react";
import { FaClock, FaLock, FaCalendarTimes } from "react-icons/fa";
import type { SlotWithMeta } from "../../types/booking";
import Skeleton from "../common/Skeleton";

interface SlotGridProps {
  slots: SlotWithMeta[];
  selectedSlotKey: string | null;
  onSelect: (slot: SlotWithMeta) => void;
  loading?: boolean;
}

const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  selectedSlotKey,
  onSelect,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <FaCalendarTimes className="text-2xl text-gray-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500">No available hours</p>
          <p className="text-xs text-gray-400 mt-0.5">
            This doctor isn't available on this day
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlotKey === slot.slotKey;

        if (slot.status === "unavailable") {
          return (
            <div
              key={slot.slotKey}
              title="Unavailable"
              className="relative py-2.5 px-2 rounded-xl text-xs font-medium text-center bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed select-none"
            >
              {slot.timeLabel}
            </div>
          );
        }

        if (slot.status === "booked") {
          return (
            <div
              key={slot.slotKey}
              title="Already booked"
              className="relative py-2.5 px-2 rounded-xl text-xs font-medium text-center bg-red-50 text-red-300 border border-red-100 cursor-not-allowed select-none flex flex-col items-center gap-0.5"
            >
              <FaLock className="text-[9px] text-red-300" />
              <span className="line-through">{slot.timeLabel}</span>
            </div>
          );
        }

        // Available
        return (
          <button
            key={slot.slotKey}
            type="button"
            onClick={() => onSelect(slot)}
            title="Available — click to select"
            className={`
              relative py-2.5 px-2 rounded-xl text-sm font-semibold transition-all duration-200 border
              flex items-center justify-center cursor-pointer
              ${
                isSelected
                  ? "bg-primary text-white border-primary shadow-lg ring-2 ring-primary/30"
                  : "bg-white text-primary border-primary/30 hover:bg-primary/5 hover:border-primary hover:shadow-md hover:-translate-y-0.5"
              }
            `}
          >
            <FaClock
              className={`mr-1.5 text-[9px] shrink-0 ${
                isSelected ? "text-white/70" : "text-primary/50"
              }`}
            />
            {slot.timeLabel}
          </button>
        );
      })}
    </div>
  );
};

export default SlotGrid;
