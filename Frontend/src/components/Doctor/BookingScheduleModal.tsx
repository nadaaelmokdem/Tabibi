import { CachedImage } from "../common/CachedImage";
import React, { useEffect, useMemo, useState } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaBriefcase,
  FaStar,
  FaCalendarCheck,
  FaClinicMedical,
  FaVideo,
  FaCommentDots,
  FaClock,
  FaLock,
} from "react-icons/fa";
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
import { getFileUrl } from "../../utils/fileUtils";
import AppointmentService from "../../services/appointmentService";
import { showErrorAlert, showSuccessAlert } from "../../utils/swalTheme";

type ConsultationType = "clinic" | "video" | "chat";

interface ConsultTypeConfig {
  id: ConsultationType;
  label: string;
  icon: React.ReactNode;
  priceKey: "clinicPrice" | "videoCallPrice" | "chatPrice";
  enabledKey: "isClinicEnabled" | "isVideoCallEnabled" | "isChatEnabled";
}

const CONSULT_TYPES: ConsultTypeConfig[] = [
  { id: "clinic", label: "Clinic", icon: <FaClinicMedical size={14} className="shrink-0" />, priceKey: "clinicPrice", enabledKey: "isClinicEnabled" },
  { id: "video",  label: "Video",  icon: <FaVideo size={14} className="shrink-0" />,          priceKey: "videoCallPrice",  enabledKey: "isVideoCallEnabled"  },
  { id: "chat",   label: "Chat",   icon: <FaCommentDots size={14} className="shrink-0" />,    priceKey: "chatPrice",   enabledKey: "isChatEnabled"   },
];

interface BookingScheduleModalProps {
  doctor: DoctorListItem;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: (slot: SelectedSlot) => void;
  initialType?: ConsultationType;
}

const BookingScheduleModal: React.FC<BookingScheduleModalProps> = ({
  doctor,
  isOpen,
  onClose,
  onBookingSuccess,
  initialType,
}) => {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatDateKey(new Date()),
  );
  
  // Internalized state
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [feedback, setFeedback] = useState<BookingFeedback | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [daySlots, setDaySlots] = useState<SlotWithMeta[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [consultType, setConsultType] = useState<ConsultationType>(initialType || "clinic");
  const [paymentMethod, setPaymentMethod] = useState<number>(1); // 1 = Online, 2 = OnSite

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const primarySpecialty = doctor.specialties[0]?.name ?? "General Practice";

  const enabledTypes = useMemo(
    () => CONSULT_TYPES.filter((ct) => doctor[ct.enabledKey]),
    [doctor],
  );

  useEffect(() => {
    if (isOpen) {
      setConsultType(initialType || "clinic");
    }
  }, [isOpen, initialType]);

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

    setDaySlots([]);
    const day = weekDays.find((d) => d.dateKey === selectedDateKey);
    if (!day || day.isPast) return;

    setLoadingSlots(true);
    try {
      const typeMap: Record<string, number> = { chat: 0, video: 1, clinic: 2 };
      const apiType = typeMap[consultType] ?? 2;
      const slots = await loadSlotsForDay(doctor, day.date, bookedSlots, apiType as any);
      setDaySlots(slots);
    } catch {
      setFeedback({
        type: "error",
        message: "Couldn't load available slots. Please try again.",
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot: SlotWithMeta, dateKey: string) => {
    if (slot.status !== "available" || bookedSlots.has(slot.slotKey)) {
      const alternatives = daySlots
        .filter((s) => s.status === "available" && s.slotKey !== slot.slotKey)
        .slice(0, 3);
      setFeedback({
        type: "error",
        message: "This slot is no longer available.",
        alternatives,
      });
      setSelectedSlot(null);
      return;
    }

    setFeedback(null);
    setSelectedSlot({
      doctorId: doctor.doctorId,
      date: dateKey,
      start: slot.start,
      end: slot.end,
      timeLabel: slot.timeLabel,
      slotKey: slot.slotKey,
    });
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);

    try {
      const typeMap: Record<string, number> = { chat: 0, video: 1, clinic: 2 };
      const apiType = typeMap[consultType] ?? 2;
      const apiPaymentMethod = consultType === "clinic" ? paymentMethod : 1;

      const res: any = await AppointmentService.bookAppointment({
        doctorId: selectedSlot.doctorId,
        scheduledAt: new Date(selectedSlot.start).toISOString(),
        type: apiType as any,
        paymentMethod: apiPaymentMethod,
      });

      const redirectUrl = res?.paymentUrl || res?.PaymentUrl || res?.sessionUrl || res?.data?.paymentUrl || res?.data?.PaymentUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setBookedSlots((prev) => {
        const next = new Set(prev);
        next.add(selectedSlot.slotKey);
        return next;
      });
      setDaySlots((prev) =>
        prev.map((s) => (s.slotKey === selectedSlot.slotKey ? { ...s, status: "booked" as const } : s))
      );

      setFeedback({
        type: "success",
        message: `Appointment successfully booked for ${selectedSlot.timeLabel}!`,
      });
      
      showSuccessAlert({
        title: 'Booking Confirmed!',
        text: `Your appointment is scheduled for ${selectedSlot.date} at ${selectedSlot.timeLabel}.`,
      }).then(() => {
        if (onBookingSuccess) onBookingSuccess(selectedSlot);
        onClose();
        setSelectedSlot(null);
        setFeedback(null);
      });

    } catch (err: any) {
      console.error("Booking failed", err);
      const errorMsg =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message || err.response?.data?.error || err.message || "Failed to book appointment. Please try again.";

      showErrorAlert({ title: 'Booking Failed', text: errorMsg });
    } finally {
      setIsBooking(false);
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

      <div className="relative w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-floating flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary-dark text-on-primary px-5 sm:px-6 py-5 shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {doctor.profilePictureUrl ? (
                  <CachedImage
                    src={getFileUrl(doctor.profilePictureUrl)}
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
                      <FaCheckCircle size={14} />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-on-primary/80 text-sm font-medium">{primarySpecialty}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-on-primary/80">
                  {doctor.clinicLocation && (
                    <span className="flex items-center gap-1">
                      <FaMapMarkerAlt size={14} className="shrink-0" /> {doctor.clinicLocation}
                    </span>
                  )}
                  {doctor.yearsOfExperience != null && (
                    <span className="flex items-center gap-1">
                      <FaBriefcase size={14} className="shrink-0" /> {doctor.yearsOfExperience} yrs
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FaStar size={14} className="text-yellow-300 shrink-0" />
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
              <FaTimes size={22} />
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

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 space-y-5">
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
              <p className="text-xs font-bold text-primary-light uppercase tracking-widest">
                Available Time Slots
              </p>
              {humanDate && (
                <p className="text-xs text-outline-variant font-medium">{humanDate}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-3 text-[10px] sm:text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <FaClock className="text-[9px] shrink-0" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <FaLock className="text-[9px] shrink-0" />
                Booked
              </span>
            </div>

            <SlotGrid
              slots={daySlots}
              selectedSlotKey={selectedSlot?.slotKey ?? null}
              loading={loadingSlots}
              onSelect={(slot) => handleSelectSlot(slot, selectedDateKey)}
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
                  <FaCheckCircle className="shrink-0 mt-0.5 text-green-500 text-lg" />
                ) : (
                  <FaExclamationCircle className="shrink-0 mt-0.5 text-red-500 text-lg" />
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
                          onClick={() => handleSelectSlot(alt, selectedDateKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-current hover:bg-white/80 transition-colors cursor-pointer"
                        >
                          <FaClock size={12} />
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

        <div className="shrink-0 border-t border-surface-variant/60 px-5 sm:px-6 py-4 bg-surface-container/40">
          {selectedSlot ? (
            <div className="mb-3 p-3 bg-white rounded-2xl border border-primary/20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FaCalendarCheck size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">
                    {selectedSlot.date}
                    <span className="text-primary ml-2">{selectedSlot.timeLabel}</span>
                  </p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <FaClock size={12} />
                    30 min session
                    {consultPrice && (
                      <>
                        <span className="mx-1 text-outline-variant">•</span>
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
            <p className="text-sm text-outline-variant mb-3 text-center sm:text-left">
              Select an available time slot to continue
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between w-full">

            {consultType === "clinic" ? (
              <div className="flex items-center gap-4 border border-surface-variant p-2 rounded-xl bg-white shadow-sm">
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant cursor-pointer">
                  <input type="radio" name="payment" value={1} checked={paymentMethod === 1} onChange={() => setPaymentMethod(1)} className="text-primary focus:ring-primary h-4 w-4" />
                  Pay Online
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant cursor-pointer">
                  <input type="radio" name="payment" value={2} checked={paymentMethod === 2} onChange={() => setPaymentMethod(2)} className="text-primary focus:ring-primary h-4 w-4" />
                  Pay at Clinic
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-green-200 p-2 rounded-xl bg-green-50 shadow-sm text-green-700 text-sm font-semibold">
                Online Payment Only
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isBooking}
                className="px-5 py-2.5 rounded-xl border border-surface-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSlot || isBooking}
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary font-semibold shadow-floating disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {isBooking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingScheduleModal;
