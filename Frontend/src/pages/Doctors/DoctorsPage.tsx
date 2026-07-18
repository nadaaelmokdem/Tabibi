import React, { useState, useEffect } from "react";
import PublicService from "../../services/publicService";
import type { DoctorListItem, DoctorSearchFilter } from "../../types/public";
import BookingScheduleModal from "../../components/Doctor/BookingScheduleModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import ChatService from "../../services/chatService";
import DoctorListFilters from "../../components/Doctors/DoctorListFilters";
import DoctorGrid from "../../components/Doctors/DoctorGrid";
import AppointmentService from "../../services/appointmentService";
import { getAiQuota } from "../../services/AIChat";
import { showErrorAlert, showInfoAlert, showWarningAlert } from "../../utils/swalTheme";

import { toast } from "react-toastify";

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
  const [error, setError] = useState<string | null>(null);

  // Search input state (allows typing before fetching)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<number | "">("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // ── Booking Modal State ──────────────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalInitialType, setBookingModalInitialType] = useState<"clinic" | "video" | "chat">("clinic");
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
      let sp: { specialtyId: number; name: string }[];
      try {
        sp = await PublicService.getSpecialties();
      } catch (error) {
        console.error(error);
        return;
      }
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
      setError(null);
      try {
        const result = await PublicService.getDoctors(filter);
        if (active) {
          setDoctors(result.items);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        }
      } catch (err: any) {
        console.error(err);
        if (active) setError(err.message || "Network Error");
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
      showWarningAlert({ title: "Not Available", text: "Doctors cannot book appointments." });
      return;
    }
    setBookingModalInitialType("clinic");
    setSelectedDoctorId(doctorId);
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedDoctorId(null);
  };

  const handleBookingSuccess = () => {
    toast.success('Appointment successfully booked!');
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
      showWarningAlert({ title: "Not Available", text: "Doctors cannot start chats with other doctors." });
      return;
    }

    if (doctor) {
      if (!doctor.isChatEnabled) {
        showInfoAlert({ title: "Chat Unavailable", text: "This doctor does not offer chat consultations." });
        return;
      }
      setSelectedDoctorForChat(doctor);
      return;
    }

    try {
      const res: any = await AppointmentService.bookAppointment({
        doctorId,
        scheduledAt: new Date().toISOString(),
        type: 0 as any, // 0 = Chat
        paymentMethod: 1, // 1 = Online
      });

      const redirectUrl = res?.paymentUrl || res?.PaymentUrl || res?.sessionUrl || res?.data?.paymentUrl || res?.data?.PaymentUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      throw new Error("Payment link could not be generated.");
    } catch (err: any) {
      showErrorAlert({ title: "Cannot start chat", text: err.response?.data?.message || err.response?.data || err.message || "Failed to start chat session." });
    }
  };

  const handleStartVideoCall = async (doctorId: number) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: "/doctors" } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      showWarningAlert({ title: "Not Available", text: "Doctors cannot start video calls with other doctors." });
      return;
    }

    setBookingModalInitialType("video");
    setSelectedDoctorId(doctorId);
    setIsBookingModalOpen(true);
  };

  const confirmStartChat = async (isCompanyPaid: boolean) => {
    if (!selectedDoctorForChat) return;

    if (!isCompanyPaid) {
      setSelectedDoctorForChat(null);
      await handleStartChat(selectedDoctorForChat.doctorId);
      return;
    }

    try {
      const assessment = localStorage.getItem("clinical_assessment");
      const sessionId = await ChatService.startSession(selectedDoctorForChat.doctorId, true, assessment);
      navigate(`/chat/${sessionId}`);
    } catch (err: any) {
      showErrorAlert({ title: "Cannot start chat", text: err.response?.data || "Failed to start chat session." });
    } finally {
      setSelectedDoctorForChat(null);
    }
  };

  const hasNonGP = selectedDoctorForChat?.specialties.some(s => s.specialtyId !== 18 && s.specialtyId !== 20) || false;
  const hasGP = selectedDoctorForChat?.specialties.some(s => s.specialtyId === 18 || s.specialtyId === 20) || false;
  const isEligibleForFreeGP = hasGP && !hasNonGP;

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 95% 0%, rgba(184,167,255,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 0% 100%, rgba(230,225,255,0.35) 0%, transparent 50%)
          `,
        }}
      />
      <div className="max-w-7xl mx-auto">

        {/* Filters Section */}
        <DoctorListFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSpecialty={selectedSpecialty}
          setSelectedSpecialty={setSelectedSpecialty}
          specialties={specialties}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          handleSearch={handleSearch}
          consultationTypes={consultationTypes}
          filter={filter}
          handleBookingTypeToggle={handleBookingTypeToggle}
        />

        {/* Results Section */}
        <DoctorGrid
          error={error}
          isLoading={isLoading}
          doctors={doctors}
          totalCount={totalCount}
          totalPages={totalPages}
          filter={filter}
          setFilter={setFilter}
          setSearchTerm={setSearchTerm}
          setSelectedSpecialty={setSelectedSpecialty}
          setMinPrice={setMinPrice}
          setMaxPrice={setMaxPrice}
          handleStartChat={handleStartChat}
          handleStartVideoCall={handleStartVideoCall}
          handleBookAppointment={handleBookAppointment}
          handlePageChange={handlePageChange}
        />

      </div>

      {/* ── Booking Modal ── */}
      {selectedDoctorObj && (
        <BookingScheduleModal
          doctor={selectedDoctorObj}
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          onBookingSuccess={handleBookingSuccess}
          initialType={bookingModalInitialType}
        />
      )}

      {/* ── Chat Modal (unchanged) ── */}
      {selectedDoctorForChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-primary/10">
            {isEligibleForFreeGP && freeGpMessages > 0 ? (
              <>
                <h3 className="text-2xl font-bold mb-3 text-primary-dark tracking-tight">Start Consultation</h3>
                <p className="mb-6 text-text-muted">
                  You selected Dr. <span className="font-semibold text-on-surface">{selectedDoctorForChat.fullName}</span>.
                  How would you like to proceed?
                </p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => confirmStartChat(true)}
                    className="w-full text-left p-4 rounded-xl border-2 border-green-100 hover:border-green-500 bg-green-50 hover:bg-green-100 transition-all group"
                  >
                    <div className="font-bold text-green-700 mb-1 flex justify-between items-center">
                      <span>Free Chat Session</span>
                      <span className="text-xs px-2 py-1 rounded-full transition-colors bg-green-200 text-green-800 group-hover:bg-green-500 group-hover:text-white">{freeGpMessages} left</span>
                    </div>
                    <p className="text-sm text-green-600 leading-snug">Use one of your monthly free GP messages. One initial message.</p>
                  </button>
                  <button
                    onClick={() => confirmStartChat(false)}
                    className="w-full text-left p-4 rounded-xl border-2 border-primary/15 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all group"
                  >
                    <div className="font-bold text-primary-dark mb-1 flex justify-between items-center">
                      <span>Paid Chat Session</span>
                      <span className="text-primary font-extrabold">{selectedDoctorForChat.chatPrice} EGP</span>
                    </div>
                    <p className="text-sm text-primary/80 leading-snug">Start a standard 7-day consultation session with unlimited messages.</p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-primary-light/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-primary-dark tracking-tight">Start Chat Consultation</h3>
                  <p className="text-text-muted text-lg">
                    Start a chat with Dr. <span className="font-semibold text-on-surface">{selectedDoctorForChat.fullName}</span> for <span className="font-bold text-primary bg-primary-light/20 px-3 py-1 rounded-full">{selectedDoctorForChat.chatPrice} EGP</span>?
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
                className="w-full py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
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
