import React, { useState, useEffect } from "react";
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PublicService from "../services/publicService";
import type { DoctorListItem, DoctorSearchFilter } from "../types/public";
import type { BookingFeedback, SelectedSlot, SlotWithMeta } from "../types/booking";
import DoctorCard from "../components/Doctor/DoctorCard";
import BookingScheduleModal from "../components/Doctor/BookingScheduleModal";
import AppointmentService from "../services/appointmentService";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import ChatService from "../services/chatService";
import { getAiQuota } from "../services/AIChat";

const DoctorsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [specialties, setSpecialties] = useState<{ specialtyId: number; name: string }[]>([]);
  const [freeGpMessages, setFreeGpMessages] = useState<number>(0);

  const [filter, setFilter] = useState<DoctorSearchFilter>({
    page: 1,
    pageSize: 10,
    bookingTypes: [],
  });

  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Search input state (allows typing before fetching)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<number | "">("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // ── Booking Modal State ──────────────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [feedback, setFeedback] = useState<BookingFeedback | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [daySlots, setDaySlots] = useState<SlotWithMeta[]>([]);
  // ────────────────────────────────────────────────────────────────────────────

  const consultationTypes = [
    { value: 0, label: "Chat" },
    { value: 1, label: "Video" },
    { value: 2, label: "Call" },
    { value: 3, label: "Clinic" }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      getAiQuota().then(quota => {
        setFreeGpMessages(quota.freeGpMessages || 0);
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchSpecialties = async () => {
      const sp = await PublicService.getSpecialties();
      setSpecialties(sp);

      const searchParams = new URLSearchParams(location.search);
      const departmentQuery = searchParams.get("department");
      if (departmentQuery) {
        const exactMatch = sp.find(s => {
          const baseName = s.name.split('(')[0].trim().toLowerCase();
          return baseName === departmentQuery.toLowerCase() || s.name.toLowerCase() === departmentQuery.toLowerCase();
        });
        const matchingSp = exactMatch || sp.find(s => s.name.toLowerCase().includes(departmentQuery.toLowerCase()));
        if (matchingSp) {
          setSelectedSpecialty(matchingSp.specialtyId);
          setFilter(prev => ({
            ...prev,
            specialtyId: matchingSp.specialtyId
          }));
        }
      }
    };
    fetchSpecialties();
  }, [location.search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await PublicService.getDoctors(filter);
        if (active) {
          setDoctors(result.items);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [filter]);

  const handleSearch = () => {
    setFilter(prev => ({
      ...prev,
      page: 1,
      name: searchTerm || undefined,
      specialtyId: selectedSpecialty ? Number(selectedSpecialty) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    }));
  };

  const handleBookingTypeToggle = (val: number) => {
    setFilter(prev => {
      const current = prev.bookingTypes || [];
      const newTypes = current.includes(val)
        ? current.filter(t => t !== val)
        : [...current, val];
      return { ...prev, bookingTypes: newTypes, page: 1 };
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilter(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Booking Handlers ─────────────────────────────────────────────────────────

  const handleBookAppointment = (doctorId: number) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: "/doctors" } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot book appointments.");
      return;
    }
    setSelectedDoctorId(doctorId);
    setIsBookingModalOpen(true);
    setSelectedSlot(null);
    setFeedback(null);
    setDaySlots([]);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedDoctorId(null);
    setSelectedSlot(null);
    setFeedback(null);
  };

  const handleSlotsLoaded = (slots: SlotWithMeta[]) => {
    setDaySlots(slots);
    setSelectedSlot(null);
    setFeedback(null);
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
      doctorId: selectedDoctorId!,
      date: dateKey,
      start: slot.start,
      end: slot.end,
      timeLabel: slot.timeLabel,
      slotKey: slot.slotKey,
    });
  };

  const handleConfirmBooking = async (typeStr: "clinic" | "video" | "call" | "chat" = "clinic") => {
    if (!selectedSlot) return;

    try {
      const typeMap: Record<string, number> = { chat: 0, video: 1, call: 2, clinic: 3 };
      const apiType = typeMap[typeStr] ?? 3;

      await AppointmentService.bookAppointment({
        doctorId: selectedSlot.doctorId,
        scheduledAt: selectedSlot.start,
        type: apiType as any,
      });

      // Optimistically mark the slot as booked in local state
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
      setSelectedSlot(null);
      setDaySlots([]);
    } catch (err) {
      console.error("Booking failed", err);
      setFeedback({
        type: "error",
        message: "Failed to book appointment. Please try again.",
      });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  const selectedDoctorObj = doctors.find((d) => d.doctorId === selectedDoctorId);

  // ── Chat Handlers (unchanged) ────────────────────────────────────────────────

  const [selectedDoctorForChat, setSelectedDoctorForChat] = useState<DoctorListItem | null>(null);

  const handleStartChat = async (doctorId: number, doctor?: DoctorListItem) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: "/doctors" } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot start chats with other doctors.");
      return;
    }

    if (doctor) {
      if (!doctor.isChatEnabled) {
        alert("This doctor does not offer chat consultations.");
        return;
      }
      setSelectedDoctorForChat(doctor);
      return;
    }

    try {
      const assessment = localStorage.getItem("clinical_assessment");
      const sessionId = await ChatService.startSession(doctorId, false, assessment);
      navigate(`/chat/${sessionId}`);
    } catch (err: any) {
      alert(err.response?.data || "Failed to start chat session.");
    }
  };

  const confirmStartChat = async (isCompanyPaid: boolean) => {
    if (!selectedDoctorForChat) return;
    try {
      const assessment = localStorage.getItem("clinical_assessment");
      const sessionId = await ChatService.startSession(selectedDoctorForChat.doctorId, isCompanyPaid, assessment);
      navigate(`/chat/${sessionId}`);
    } catch (err: any) {
      alert(err.response?.data || "Failed to start chat session.");
    } finally {
      setSelectedDoctorForChat(null);
    }
  };

  const hasNonGP = selectedDoctorForChat?.specialties.some(s => s.specialtyId !== 18 && s.specialtyId !== 20) || false;
  const hasGP = selectedDoctorForChat?.specialties.some(s => s.specialtyId === 18 || s.specialtyId === 20) || false;
  const isEligibleForFreeGP = hasGP && !hasNonGP;

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Filters Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-10 border border-white/50">
          <div className="flex items-center gap-2 mb-4 text-primary font-bold text-lg">
            <FaFilter /> Filters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
            <div className="relative lg:col-span-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none bg-gray-50/50 focus:bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <select
              className="w-full lg:col-span-3 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none bg-gray-50/50 focus:bg-white cursor-pointer"
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value as number | "")}
            >
              <option value="">All Specialties</option>
              {specialties.map(s => (
                <option key={s.specialtyId} value={s.specialtyId}>{s.name}</option>
              ))}
            </select>

            <div className="flex gap-2 lg:col-span-3">
              <input
                type="number"
                placeholder="Min (EGP)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none bg-gray-50/50 focus:bg-white"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max (EGP)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none bg-gray-50/50 focus:bg-white"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>

            <button
              onClick={handleSearch}
              className="w-full lg:col-span-2 bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex justify-center items-center gap-2"
            >
              <FaSearch /> Apply
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-500 mr-2">Consultation Types:</span>
            {consultationTypes.map(type => {
              const isActive = (filter.bookingTypes || []).includes(type.value);
              return (
                <button
                  key={type.value}
                  onClick={() => handleBookingTypeToggle(type.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
          </div>
        ) : doctors.length > 0 ? (
          <div className="space-y-6">
            <div className="text-gray-500 font-medium px-2">
              Found {totalCount} doctor{totalCount !== 1 ? 's' : ''} matching your criteria
            </div>
            {doctors.map(doctor => (
              <DoctorCard
                key={doctor.doctorId}
                doctor={doctor}
                onStartChat={(id) => handleStartChat(id, doctor)}
                onBookAppointment={handleBookAppointment}
              />
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-12 mb-8">
                <button
                  onClick={() => handlePageChange((filter.page || 1) - 1)}
                  disabled={(filter.page || 1) === 1}
                  className={`p-3 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    (filter.page || 1) === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-primary shadow-md hover:shadow-lg hover:bg-blue-50'
                  }`}
                >
                  <FaChevronLeft />
                </button>

                <span className="font-semibold text-gray-700">
                  Page {filter.page} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange((filter.page || 1) + 1)}
                  disabled={(filter.page || 1) === totalPages}
                  className={`p-3 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    (filter.page || 1) === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-primary shadow-md hover:shadow-lg hover:bg-blue-50'
                  }`}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <div className="text-gray-300 mb-4 flex justify-center">
              <FaSearch size={64} />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No doctors found</h3>
            <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedSpecialty("");
                setMinPrice("");
                setMaxPrice("");
                setFilter({ page: 1, pageSize: 10, bookingTypes: [] });
              }}
              className="mt-6 text-primary hover:text-blue-700 font-semibold transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}

      </div>

      {/* ── Booking Modal ── */}
      {selectedDoctorObj && (
        <BookingScheduleModal
          doctor={selectedDoctorObj}
          isOpen={isBookingModalOpen}
          selectedSlot={selectedSlot}
          feedback={feedback}
          bookedSlots={bookedSlots}
          daySlots={daySlots}
          onClose={handleCloseBookingModal}
          onSlotsLoaded={handleSlotsLoaded}
          onSelectSlot={handleSelectSlot}
          onConfirm={handleConfirmBooking}
          onPickAlternative={handleSelectSlot}
        />
      )}

      {/* ── Chat Modal (unchanged) ── */}
      {selectedDoctorForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
            {isEligibleForFreeGP && freeGpMessages > 0 ? (
              <>
                <h3 className="text-2xl font-bold mb-3 text-gray-800">Start Consultation</h3>
                <p className="mb-6 text-gray-600">
                  You selected Dr. <span className="font-semibold text-gray-800">{selectedDoctorForChat.fullName}</span>.
                  How would you like to proceed?
                </p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => confirmStartChat(true)}
                    className="w-full text-left p-4 rounded-xl border-2 border-green-100 hover:border-green-500 bg-green-50 hover:bg-green-100 transition-all group"
                  >
                    <div className="font-bold text-green-700 mb-1 flex justify-between items-center">
                      <span>Free Company-Paid Session</span>
                      <span className="text-xs px-2 py-1 rounded-full transition-colors bg-green-200 text-green-800 group-hover:bg-green-500 group-hover:text-white">{freeGpMessages} left</span>
                    </div>
                    <p className="text-sm text-green-600 leading-snug">Use one of your monthly free GP messages. One initial message.</p>
                  </button>
                  <button
                    onClick={() => confirmStartChat(false)}
                    className="w-full text-left p-4 rounded-xl border-2 border-blue-100 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 transition-all group"
                  >
                    <div className="font-bold text-blue-700 mb-1 flex justify-between items-center">
                      <span>Paid Chat Session</span>
                      <span className="text-primary font-extrabold">{selectedDoctorForChat.chatPrice} EGP</span>
                    </div>
                    <p className="text-sm text-blue-600 leading-snug">Start a standard 24-hour consultation session with unlimited messages.</p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-[var(--color-primary-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-800">Start Chat Consultation</h3>
                  <p className="text-gray-600 text-lg">
                    Start a chat with Dr. <span className="font-semibold text-gray-800">{selectedDoctorForChat.fullName}</span> for <span className="font-bold text-primary bg-[var(--color-primary-light)]/20 px-3 py-1 rounded-full">{selectedDoctorForChat.chatPrice} EGP</span>?
                  </p>
                </div>
                <button
                  onClick={() => confirmStartChat(false)}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Start Chat
                </button>
              </>
            )}
            <div className={`flex gap-3 ${isEligibleForFreeGP && freeGpMessages > 0 ? 'mt-6' : 'mt-3'}`}>
              <button
                onClick={() => { setSelectedDoctorForChat(null); }}
                className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsPage;
