import React, { useEffect, useMemo, useState } from "react";
import {
  MdClose,
  MdVerified,
  MdErrorOutline,
  MdLocationOn,
  MdWork,
  MdStar,
  MdEventAvailable,
  MdLocalHospital,
  MdVideocam,
  MdPhone,
  MdChat,
  MdAccessTime,
} from "react-icons/md";
import type { DoctorListItem } from "../../types/public";
import type { BookingFeedback, SelectedSlot, SlotWithMeta } from "../../types/booking";
import WeekDayPicker from "./WeekDayPicker";
import SlotGrid from "./SlotGrid";
import {
  formatDateKey,
  getStartOfWeek,
  getWeekDays,
  loadSlotsForDay,
  buildMockSlotsForDay,
} from "../../utils/slotUtils";

type ConsultationType = "clinic" | "video" | "call" | "chat";

interface ConsultTypeConfig {
  id: ConsultationType;
  label: string;
  icon: React.ReactNode;
  priceKey: "clinicPrice" | "videoPrice" | "callPrice" | "chatPrice";
  enabledKey: "isClinicEnabled" | "isVideoEnabled" | "isCallEnabled" | "isChatEnabled";
}

const CONSULT_TYPES: ConsultTypeConfig[] = [
  { id: "clinic", label: "Clinic", icon: <MdLocalHospital size={14} className="shrink-0" />, priceKey: "clinicPrice", enabledKey: "isClinicEnabled" },
  { id: "video",  label: "Video",  icon: <MdVideocam size={14} className="shrink-0" />,          priceKey: "videoPrice",  enabledKey: "isVideoEnabled"  },
  { id: "call",   label: "Phone",  icon: <MdPhone size={14} className="shrink-0" />,          priceKey: "callPrice",   enabledKey: "isCallEnabled"   },
  { id: "chat",   label: "Chat",   icon: <MdChat size={14} className="shrink-0" />,    priceKey: "chatPrice",   enabledKey: "isChatEnabled"   },
];

interface BookingScheduleModalProps {
  doctor: DoctorListItem;
  isOpen: boolean;
  selectedSlot: SelectedSlot | null;
  feedback: BookingFeedback | null;
  bookedSlots: Set<string>;
  daySlots: SlotWithMeta[];
  onClose: () => void;
  onSlotsLoaded: (slots: SlotWithMeta[]) => void;
  onSelectSlot: (slot: SlotWithMeta, dateKey: string) => void;
  onConfirm: (type: ConsultationType) => void;
  onPickAlternative: (slot: SlotWithMeta, dateKey: string) => void;
}

const BookingScheduleModal: React.FC<BookingScheduleModalProps> = ({
  doctor,
  isOpen,
  selectedSlot,
  feedback,
  bookedSlots,
  daySlots,
  onClose,
  onSlotsLoaded,
  onSelectSlot,
  onConfirm,
  onPickAlternative,
}) => {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatDateKey(new Date()),
  );
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [consultType, setConsultType] = useState<ConsultationType>("clinic");

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const primarySpecialty = doctor.specialties[0]?.name ?? "General Practice";

  const enabledTypes = useMemo(
    () => CONSULT_TYPES.filter((ct) => doctor[ct.enabledKey]),
    [doctor],
  );

  useEffect(() => {
    if (enabledTypes.length > 0 && !enabledTypes.find((ct) => ct.id === consultType)) {
      setConsultType(enabledTypes[0].id);
    }
  }, [enabledTypes, consultType]);

  const consultPrice = useMemo(() => {
    const found = CONSULT_TYPES.find((ct) => ct.id === consultType);
    if (!found) return null;
    const p = doctor[found.priceKey];
    return p > 0 ? p : null;
  }, [doctor, consultType]);

  const slotCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    weekDays.forEach((day) => {
      if (!day.isPast) {
        const slots = buildMockSlotsForDay(doctor, day.date, bookedSlots);
        counts[day.dateKey] = slots.filter((s) => s.status === "available").length;
      }
    });
    return counts;
  }, [weekDays, doctor, bookedSlots]);

  const fetchSlots = async () => {
    if (!selectedDateKey || !doctor.doctorId) return;

    onSlotsLoaded([]);
    const day = weekDays.find((d) => d.dateKey === selectedDateKey);
    if (!day || day.isPast) return;

    setLoadingSlots(true);
    try {
      const slots = await loadSlotsForDay(doctor, day.date, bookedSlots);
      onSlotsLoaded(slots);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (!selectedDateKey || !doctor.doctorId || !isOpen) return;
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateKey, doctor.doctorId, isOpen]);

  if (!isOpen) return null;

  const handleDaySelect = (day: (typeof weekDays)[number]) => {
    if (day.isPast) return;
    setSelectedDateKey(day.dateKey);
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const selectedDayObj = weekDays.find((d) => d.dateKey === selectedDateKey);
  const humanDate = selectedDayObj?.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary-dark text-on-primary px-5 sm:px-6 py-5 shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {doctor.profilePictureUrl ? (
                  <img
                    src={doctor.profilePictureUrl}
                    alt={doctor.fullName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  doctor.fullName.charAt(0)
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h2 id="booking-modal-title" className="text-lg sm:text-xl font-bold">
                    Dr. {doctor.fullName}
                  </h2>
                  {(doctor as { isVerified?: boolean }).isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20">
                      <MdVerified size={14} />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-on-primary/80 text-sm font-medium">{primarySpecialty}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-on-primary/80">
                  {doctor.clinicLocation && (
                    <span className="flex items-center gap-1">
                      <MdLocationOn size={14} className="shrink-0" /> {doctor.clinicLocation}
                    </span>
                  )}
                  {doctor.yearsOfExperience != null && (
                    <span className="flex items-center gap-1">
                      <MdWork size={14} className="shrink-0" /> {doctor.yearsOfExperience} yrs
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MdStar size={14} className="text-yellow-300 shrink-0" />
                    {doctor.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer shrink-0 mt-0.5"
              aria-label="Close booking modal"
            >
              <MdClose size={22} />
            </button>
          </div>

          {enabledTypes.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
              {enabledTypes.map((ct) => {
                const isActive = consultType === ct.id;
                const price = doctor[ct.priceKey];
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setConsultType(ct.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                      whitespace-nowrap border transition-all cursor-pointer shrink-0
                      ${
                        isActive
                          ? "bg-white text-primary border-white shadow-md"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }
                    `}
                  >
                    {ct.icon}
                    {ct.label}
                    {price > 0 && (
                      <span className={`ml-0.5 ${isActive ? "text-primary/70" : "text-white/60"}`}>
                        {price} EGP
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          <WeekDayPicker
            days={weekDays}
            selectedDateKey={selectedDateKey}
            onSelect={handleDaySelect}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            slotCountByDate={slotCountByDate}
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Available Time Slots
              </p>
              {humanDate && (
                <p className="text-xs text-gray-400 font-medium">{humanDate}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-3 text-[10px] sm:text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-primary/40 bg-white inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" />
                Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
                Unavailable
              </span>
            </div>

            <SlotGrid
              slots={daySlots}
              selectedSlotKey={selectedSlot?.slotKey ?? null}
              loading={loadingSlots}
              onSelect={(slot) => onSelectSlot(slot, selectedDateKey)}
            />
          </div>

          {feedback && (
            <div
              className={`rounded-2xl p-4 flex gap-3 border ${
                feedback.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div>
                {feedback.type === "success" ? (
                  <MdVerified className="shrink-0 mt-0.5 text-green-500 text-lg" />
                ) : (
                  <MdErrorOutline className="shrink-0 mt-0.5 text-red-500 text-lg" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{feedback.message}</p>
                {feedback.alternatives && feedback.alternatives.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-2 opacity-70">
                      Try one of these slots:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.alternatives.map((alt) => (
                        <button
                          key={alt.slotKey}
                          type="button"
                          onClick={() => onPickAlternative(alt, selectedDateKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-current hover:bg-white/80 transition-colors cursor-pointer"
                        >
                          <MdAccessTime size={12} />
                          {alt.timeLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 sm:px-6 py-4 bg-gray-50/60">
          {selectedSlot ? (
            <div className="mb-3 p-3 bg-white rounded-2xl border border-primary/20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MdEventAvailable size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {selectedSlot.date}
                    <span className="text-primary ml-2">{selectedSlot.timeLabel}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MdAccessTime size={12} />
                    30 min session
                    {consultPrice && (
                      <>
                        <span className="mx-1 text-gray-300">•</span>
                        <span className="font-semibold text-primary">
                          {consultPrice} EGP
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3 text-center sm:text-left">
              Select an available time slot to continue
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => onConfirm(consultType)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary font-semibold shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:-translate-y-0.5"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingScheduleModal;
