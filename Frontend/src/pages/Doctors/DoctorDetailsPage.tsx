import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import PublicService from "../../services/publicService";
import type { DoctorListItem } from "../../types/public";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { getAiQuota } from "../../services/AIChat";
import PatientService from "../../services/patientService";
import ChatService from "../../services/chatService";
import BookingScheduleModal from "../../components/Doctor/BookingScheduleModal";
import AppointmentService from "../../services/appointmentService";

import { toast } from "react-toastify";
import DoctorInfoCard from "../../components/Doctors/DoctorInfoCard";
import DoctorPricingMatrix from "../../components/Doctors/DoctorPricingMatrix";
import DoctorReviewsSection from "../../components/Doctors/DoctorReviewsSection";
import DoctorActionsCard from "../../components/Doctors/DoctorActionsCard";

const getConsultationTypeName = (type: number | string | undefined) => {
  if (type === undefined) return '';
  if (typeof type === 'string') return type === 'Clinic' ? 'Clinic visit' : type;
  switch (type) {
    case 0: return 'Chat';
    case 1: return 'Video';
    case 2: return 'Clinic visit';
    default: return 'Appointment';
  }
};

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeGpMessages, setFreeGpMessages] = useState<number>(0);
  
  // ── Booking Modal State ──────────────────────────────────────────────────────
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  // ────────────────────────────────────────────────────────────────────────────

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setTimeout(() => setLoading(true), 0);
      PublicService.getDoctorById(id)
        .then(data => {
          setDoctor(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError("Failed to load doctor profile.");
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) {
      getAiQuota().then(quota => {
        setFreeGpMessages(quota.freeGpMessages || 0);
      }).catch(console.error);
    } else {
      setTimeout(() => setFreeGpMessages(0), 0);
    }
  }, [isAuthenticated, user?.id, user?.activeRole]);



  useEffect(() => {
    if (doctor) {
      let active = true;
      setTimeout(() => { if (active) setReviewsLoading(true); }, 0);
      PublicService.getDoctorReviews(doctor.doctorId, reviewsPage, 5)
        .then(res => {
          setReviews(res?.items || []);
          setReviewsTotal(res?.totalCount || 0);
        })
        .catch(console.error)
        .finally(() => { if (active) setReviewsLoading(false); });
        
      return () => { active = false; };
    }
  }, [doctor, reviewsPage]);

  const handleRateDoctor = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: `/doctors/${doctor?.doctorId}` } });
      return;
    }

    try {
      Swal.fire({
        title: 'Loading...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const allAppointments = await PatientService.getAppointments({ status: 'Completed' });
      const completedWithDoctor = allAppointments.filter(
        (a: any) => a.doctorId === doctor?.doctorId
      );

      if (completedWithDoctor.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Cannot Rate Doctor',
          text: "You can't rate this doctor because you didn't book with him yet.",
          customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'bg-primary text-white px-6 py-2 rounded-xl'
          }
        });
        return;
      }



      const appointmentOptionsHtml = completedWithDoctor.map((a: any) => {
        const dateStr = new Date(a.scheduledAt).toLocaleDateString();
        const ratedText = a.reviewRating ? `(Rated: ${a.reviewRating}★)` : '(Unrated)';
        const typeName = getConsultationTypeName(a.consultationType);
        return `<option value="${a.appointmentId}" data-rating="${a.reviewRating || 0}" data-comment="${a.reviewComment || ''}">
          ${typeName} on ${dateStr} ${ratedText}
        </option>`;
      }).join('');

      Swal.fire({
        html: `
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-50 mb-6 shadow-sm border border-yellow-200">
              <svg class="h-10 w-10 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <h2 class="text-3xl font-extrabold text-primary-dark mb-2">Rate Your Experience</h2>
            <p class="text-sm text-text-muted mb-6">How was your consultation with Dr. ${doctor?.fullName}?</p>
            
            <div class="text-left mb-6">
              <label class="block text-sm font-semibold text-on-surface mb-2 ml-1">Select Appointment</label>
              <select id="swal-appointment-select" class="w-full bg-surface-container border border-surface-variant rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface text-sm shadow-inner transition-colors cursor-pointer">
                ${appointmentOptionsHtml}
              </select>
            </div>

            <div class="flex justify-center gap-3 mb-6" id="swal-rating">
              ${[1, 2, 3, 4, 5].map(i => `
                <button type="button" class="star-btn transition-transform hover:scale-125 focus:outline-none" data-value="${i}">
                  <svg class="w-10 h-10 text-surface-variant drop-shadow-sm transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="swal-rating-value" value="0">
            
            <div id="swal-edit-alert" class="hidden bg-primary/10 text-primary-dark p-3 rounded-xl mb-6 text-sm text-left border border-primary/15 flex items-start gap-2 shadow-sm">
              <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>You have already rated this appointment. Submitting again will update your existing rating.</span>
            </div>

            <div class="text-left">
              <label class="block text-sm font-semibold text-on-surface mb-2 ml-1">Additional Comments (Optional)</label>
              <textarea id="swal-comment" rows="4" class="w-full bg-surface-container border border-surface-variant rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary p-4 outline-none resize-none transition-all text-on-surface text-sm shadow-inner" placeholder="Tell us what you liked or how they can improve..."></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Feedback',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full border border-surface-variant',
          htmlContainer: 'w-full m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mt-4 text-lg',
          cancelButton: 'w-full mt-3 py-3.5 text-text-muted font-semibold hover:text-primary-dark hover:bg-surface-variant rounded-2xl transition-colors',
          actions: 'flex flex-col w-full m-0'
        },
        didOpen: () => {
          const stars = document.querySelectorAll('.star-btn');
          const ratingInput = document.getElementById('swal-rating-value') as HTMLInputElement;
          const select = document.getElementById('swal-appointment-select') as HTMLSelectElement;
          const commentInput = document.getElementById('swal-comment') as HTMLTextAreaElement;
          const editAlert = document.getElementById('swal-edit-alert') as HTMLDivElement;
          
          const updateStars = (val: number) => {
            stars.forEach((s, idx) => {
              const svg = s.querySelector('svg');
              if (idx < val) {
                svg?.classList.remove('text-surface-variant');
                svg?.classList.add('text-yellow-400');
              } else {
                svg?.classList.add('text-surface-variant');
                svg?.classList.remove('text-yellow-400');
              }
            });
          };

          const updateFormFromSelection = () => {
             const selectedOpt = select.options[select.selectedIndex];
             const rating = parseInt(selectedOpt.dataset.rating || '0');
             const comment = selectedOpt.dataset.comment || '';
             
             if (rating > 0) {
               ratingInput.value = rating.toString();
               updateStars(rating);
               commentInput.value = comment;
               editAlert.classList.remove('hidden');
               Swal.getConfirmButton()!.textContent = 'Update Feedback';
             } else {
               ratingInput.value = '0';
               updateStars(0);
               commentInput.value = '';
               editAlert.classList.add('hidden');
               Swal.getConfirmButton()!.textContent = 'Submit Feedback';
             }
          };

          select.addEventListener('change', updateFormFromSelection);
          
          updateFormFromSelection();

          stars.forEach(star => {
            star.addEventListener('click', (e) => {
              const val = parseInt((e.currentTarget as HTMLButtonElement).dataset.value!);
              ratingInput.value = val.toString();
              updateStars(val);
            });
            
            star.addEventListener('mouseenter', (e) => {
               if (ratingInput.value === '0') {
                 const val = parseInt((e.currentTarget as HTMLButtonElement).dataset.value!);
                 updateStars(val);
               }
            });
            
            star.addEventListener('mouseleave', () => {
               if (ratingInput.value === '0') {
                 updateStars(0);
               } else {
                 updateStars(parseInt(ratingInput.value));
               }
            });
          });
        },
        preConfirm: () => {
          const rating = parseInt((document.getElementById('swal-rating-value') as HTMLInputElement).value);
          const comment = (document.getElementById('swal-comment') as HTMLTextAreaElement).value;
          const appointmentId = parseInt((document.getElementById('swal-appointment-select') as HTMLSelectElement).value);
          
          if (!rating || rating === 0) {
            Swal.showValidationMessage('Please select a star rating to continue.');
            return false;
          }
          return { appointmentId, rating, comment };
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          PatientService.submitReview(result.value.appointmentId, result.value.rating, result.value.comment)
            .then(() => {
              toast.success('Feedback submitted! Thank you.');
              setReviewsPage(1); // Refresh reviews
              PublicService.getDoctorById(doctor!.doctorId).then(setDoctor).catch(console.error);
            })
            .catch(err => {
              Swal.fire({
                icon: 'error',
                title: 'Cannot Submit Review',
                text: err.message || 'Failed to submit review.',
                customClass: {
                  popup: 'rounded-3xl',
                  confirmButton: 'bg-primary text-white px-6 py-2 rounded-xl'
                }
              });
            });
        }
      });

    } catch (err) {
      console.error(err);
      Swal.close();
      toast.error('Error checking appointments.');
    }
  };

  const isSelf = user?.id === doctor?.userId;

  const handleStartChat = async (isCompanyPaid: boolean = false) => {
    if (!doctor) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: `/doctors/${doctor.doctorId}` } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot start chats with other doctors.");
      return;
    }

    try {
      const assessment = localStorage.getItem("clinical_assessment");
      
      if (!isCompanyPaid) {
        const res: any = await AppointmentService.bookAppointment({
          doctorId: doctor.doctorId,
          scheduledAt: new Date().toISOString(),
          type: 0 as any, // 0 = Chat
          paymentMethod: 1 // 1 = Online
        });
        
        const redirectUrl = res?.paymentUrl || res?.PaymentUrl || res?.sessionUrl || res?.data?.paymentUrl || res?.data?.PaymentUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        } else {
          throw new Error("Payment link could not be generated.");
        }
      } else {
        const sessionId = await ChatService.startSession(doctor.doctorId, isCompanyPaid, assessment);
        navigate(`/chat/${sessionId}`);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot start chat',
        text: err.response?.data?.message || err.message || err.response?.data || "Failed to start chat session.",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
        }
      });
    }
  };

  const handleStartVideoCall = async () => {
    if (!doctor) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: `/doctors/${doctor.doctorId}` } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot start video calls with other doctors.");
      return;
    }

    try {
      const res: any = await AppointmentService.bookAppointment({
        doctorId: doctor.doctorId,
        scheduledAt: new Date().toISOString(),
        type: 1 as any, // 1 = Video
        paymentMethod: 1 // 1 = Online
      });
      
      const redirectUrl = res?.paymentUrl || res?.PaymentUrl || res?.sessionUrl || res?.data?.paymentUrl || res?.data?.PaymentUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      } else {
        if (res?.sessionId) {
          navigate(`/video-call/${res.sessionId}`);
        } else {
          throw new Error("Payment link or session could not be generated.");
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot start Video Call',
        text: err.response?.data?.message || err.message || err.response?.data || "Failed to start session.",
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl',
          confirmButton: 'w-full bg-red-500 text-white font-bold py-3 px-4 rounded-xl',
        }
      });
    }
  };

  const handleChatClick = () => {
    if (!doctor) return;
    
    if (!doctor.isChatEnabled) {
      Swal.fire({
        icon: 'info',
        title: 'Chat Unavailable',
        text: "This doctor does not offer chat consultations.",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
        }
      });
      return;
    }

    const hasNonGP = doctor.specialties.some(s => s.specialtyId !== 18 && s.specialtyId !== 20);
    const hasGP = doctor.specialties.some(s => s.specialtyId === 18 || s.specialtyId === 20);
    const isEligibleForFreeGP = hasGP && !hasNonGP;

    if (isEligibleForFreeGP && freeGpMessages > 0) {
      Swal.fire({
        title: 'Start Consultation',
        html: `
          <p class="mb-6 text-on-surface-variant text-left">
            You selected Dr. <span class="font-semibold text-primary-dark">${doctor.fullName}</span>. 
            How would you like to proceed?
          </p>
          <div class="flex flex-col gap-4">
            <button id="btn-free" class="w-full text-left p-5 rounded-2xl border-2 border-green-100 hover:border-green-500 bg-green-50/50 hover:bg-green-50 transition-all group shadow-sm hover:shadow-md">
              <div class="font-bold text-green-700 mb-2 flex justify-between items-center text-lg">
                <span>Free Session</span>
                <span class="text-xs bg-green-200 text-green-800 px-2.5 py-1 rounded-full group-hover:bg-green-500 group-hover:text-white transition-colors font-semibold">${freeGpMessages} left</span>
              </div>
              <p class="text-sm text-green-600 leading-relaxed">Use your monthly company-paid GP messages. Covers one initial query.</p>
            </button>
            <button id="btn-paid" class="w-full text-left p-5 rounded-2xl border-2 border-[var(--color-primary-light)]/50 hover:border-primary bg-surface-container hover:bg-surface-container-high transition-all group shadow-sm hover:shadow-md">
              <div class="font-bold text-primary mb-2 flex justify-between items-center text-lg">
                <span>Paid Session</span>
                <span class="text-white font-black bg-primary px-3 py-1 rounded-full group-hover:bg-primary-dark transition-colors">${doctor.chatPrice} EGP</span>
              </div>
              <p class="text-sm text-primary-dark leading-relaxed">Start a standard 24-hour consultation session with unlimited messages.</p>
            </button>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-3 text-primary-dark text-left w-full',
          htmlContainer: 'w-full m-0',
          cancelButton: 'w-full mt-6 py-3 text-text-muted font-semibold hover:text-primary-dark hover:bg-surface-variant rounded-xl transition-colors',
          actions: 'flex flex-col w-full m-0'
        },
        didOpen: () => {
          const btnFree = Swal.getPopup()?.querySelector('#btn-free');
          const btnPaid = Swal.getPopup()?.querySelector('#btn-paid');
          btnFree?.addEventListener('click', () => { Swal.close(); handleStartChat(true); });
          btnPaid?.addEventListener('click', () => { Swal.close(); handleStartChat(false); });
        }
      });
    } else {
      Swal.fire({
        title: 'Start Chat Consultation',
        html: `
          <div class="text-center mb-6">
            <div class="w-20 h-20 bg-[var(--color-primary-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <p class="text-on-surface-variant text-lg">
              Start a chat with Dr. <span class="font-semibold text-primary-dark">${doctor.fullName}</span> for <span class="font-bold text-primary bg-[var(--color-primary-light)]/20 px-3 py-1 rounded-full">${doctor.chatPrice} EGP</span>?
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Start Chat',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-4 text-primary-dark',
          htmlContainer: 'w-full m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5',
          cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-primary-dark hover:bg-surface-variant rounded-xl transition-colors',
          actions: 'flex flex-col w-full m-0'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          handleStartChat(false);
        }
      });
    }
  };

  // ── Booking Modal Handlers ───────────────────────────────────────────────────
  const handleOpenBookingModal = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: `/doctors/${doctor?.doctorId}` } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot book appointments.");
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  const handleBookingSuccess = () => {
    toast.success('Appointment successfully booked!');
  };
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-background">
        <h2 className="text-2xl font-bold text-primary-dark mb-4">{error || "Doctor not found"}</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline flex items-center gap-2">
          <FaChevronLeft /> Go Back
        </button>
      </div>
    );
  }



  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 95% 0%, rgba(184,167,255,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 0% 100%, rgba(230,225,255,0.35) 0%, transparent 50%)
          `,
        }}
      />
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation */}
        <button
          onClick={() => navigate('/doctors')}
          className="text-text-muted hover:text-primary font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <FaChevronLeft /> Back to Doctors
        </button>

        {/* Header / Basic Info */}
        <DoctorInfoCard doctor={doctor} isSelf={isSelf} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Specialties & Pricing Matrix */}
            <DoctorPricingMatrix doctor={doctor} />

            {/* Reviews Section */}
            <DoctorReviewsSection 
              user={user}
              reviews={reviews}
              reviewsTotal={reviewsTotal}
              reviewsLoading={reviewsLoading}
              reviewsPage={reviewsPage}
              setReviewsPage={setReviewsPage}
              handleRateDoctor={handleRateDoctor}
              getConsultationTypeName={getConsultationTypeName}
            />

          </div>

          {/* Right Column: Actions & Booking */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Action Card */}
            <DoctorActionsCard 
              doctor={doctor}
              isSelf={isSelf}
              handleOpenBookingModal={handleOpenBookingModal}
              handleStartVideoCall={handleStartVideoCall}
              handleChatClick={handleChatClick}
            />

          </div>
        </div>
        
        {/* Booking Schedule Modal */}
        <BookingScheduleModal
          doctor={doctor}
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          onBookingSuccess={handleBookingSuccess}
        />

      </div>
    </div>
  );
}
