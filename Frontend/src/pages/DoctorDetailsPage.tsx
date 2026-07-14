import { CachedImage } from "../components/common/CachedImage";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaStar, FaMapMarkerAlt, FaBriefcase, FaVideo, FaCommentDots, FaPhone, FaClinicMedical, FaRegCalendarAlt, FaChevronLeft } from "react-icons/fa";
import PublicService from "../services/publicService";
import type { DoctorListItem } from "../types/public";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";
import { getAiQuota } from "../services/AIChat";
import PatientService from "../services/patientService";
import ChatService from "../services/chatService";
import BookingScheduleModal from "../components/Doctor/BookingScheduleModal";
import AppointmentService from "../services/appointmentService";

import { toast } from "react-toastify";
import { getFileUrl } from "../utils/fileUtils";

const getConsultationTypeName = (type: number | string | undefined) => {
  if (type === undefined) return '';
  if (typeof type === 'string') return type === 'Clinic' ? 'Clinic visit' : type;
  switch (type) {
    case 0: return 'Chat';
    case 1: return 'Video';
    case 2: return 'Call';
    case 3: return 'Clinic visit';
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
            <h2 class="text-3xl font-extrabold text-gray-900 mb-2">Rate Your Experience</h2>
            <p class="text-sm text-gray-500 mb-6">How was your consultation with Dr. ${doctor?.fullName}?</p>
            
            <div class="text-left mb-6">
              <label class="block text-sm font-semibold text-gray-700 mb-2 ml-1">Select Appointment</label>
              <select id="swal-appointment-select" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-700 text-sm shadow-inner transition-colors cursor-pointer">
                ${appointmentOptionsHtml}
              </select>
            </div>

            <div class="flex justify-center gap-3 mb-6" id="swal-rating">
              ${[1, 2, 3, 4, 5].map(i => `
                <button type="button" class="star-btn transition-transform hover:scale-125 focus:outline-none" data-value="${i}">
                  <svg class="w-10 h-10 text-gray-200 drop-shadow-sm transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="swal-rating-value" value="0">
            
            <div id="swal-edit-alert" class="hidden bg-blue-50 text-blue-700 p-3 rounded-xl mb-6 text-sm text-left border border-blue-100 flex items-start gap-2 shadow-sm">
              <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>You have already rated this appointment. Submitting again will update your existing rating.</span>
            </div>

            <div class="text-left">
              <label class="block text-sm font-semibold text-gray-700 mb-2 ml-1">Additional Comments (Optional)</label>
              <textarea id="swal-comment" rows="4" class="w-full bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary p-4 outline-none resize-none transition-all text-gray-700 text-sm shadow-inner" placeholder="Tell us what you liked or how they can improve..."></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Feedback',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full border border-gray-100',
          htmlContainer: 'w-full m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mt-4 text-lg',
          cancelButton: 'w-full mt-3 py-3.5 text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-100 rounded-2xl transition-colors',
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
                svg?.classList.remove('text-gray-200');
                svg?.classList.add('text-yellow-400');
              } else {
                svg?.classList.add('text-gray-200');
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
          popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
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
          popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-[#6a5acd] hover:bg-[#5b4eb8] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
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
          <p class="mb-6 text-gray-600 text-left">
            You selected Dr. <span class="font-semibold text-gray-800">${doctor.fullName}</span>. 
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
          popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100',
          title: 'text-2xl font-bold mb-3 text-gray-800 text-left w-full',
          htmlContainer: 'w-full m-0',
          cancelButton: 'w-full mt-6 py-3 text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors',
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
            <p class="text-gray-600 text-lg">
              Start a chat with Dr. <span class="font-semibold text-gray-800">${doctor.fullName}</span> for <span class="font-bold text-primary bg-[var(--color-primary-light)]/20 px-3 py-1 rounded-full">${doctor.chatPrice} EGP</span>?
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Start Chat',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-4 text-gray-800',
          htmlContainer: 'w-full m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5',
          cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors',
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
        <div className="bg-white rounded-3xl shadow-sm border border-primary/10 p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

          <div className="shrink-0 relative">
            {doctor.profilePictureUrl ? (
              <CachedImage
                src={getFileUrl(doctor.profilePictureUrl)}
                alt={doctor.fullName}
                className="w-40 h-40 rounded-2xl object-cover shadow-lg border-4 border-white"
              />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-5xl font-bold shadow-lg border-4 border-white">
                {doctor.fullName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
              </div>
            )}
            {isSelf && (
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-primary to-primary-light text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                You
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-primary-dark tracking-tight mb-2">
                  Dr. {doctor.fullName}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {doctor.specialties.map(spec => (
                    <span key={spec.specialtyId} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                      {spec.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex flex-col items-center shadow-sm">
                <div className="flex items-center text-yellow-500 font-bold text-xl gap-1">
                  <FaStar /> {doctor.averageRating.toFixed(1)}
                </div>
                <span className="text-xs text-text-muted font-medium">Rating</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-text-muted font-medium text-sm">
              {doctor.yearsOfExperience !== undefined && doctor.yearsOfExperience !== null && (
                <div className="flex items-center gap-2">
                  <FaBriefcase className="text-primary/70 text-lg" /> {doctor.yearsOfExperience} Years Experience
                </div>
              )}
              {doctor.clinicLocation && (
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-primary/70 text-lg" /> {doctor.clinicLocation}
                </div>
              )}
            </div>

            {doctor.bio && (
              <div className="mt-4">
                <h3 className="font-bold text-primary-dark mb-1">About</h3>
                <p className="text-text-muted leading-relaxed">{doctor.bio}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Specialties & Pricing Matrix */}
            <div className="bg-white rounded-3xl shadow-sm border border-primary/10 p-8">
              <h2 className="text-2xl font-bold text-primary-dark tracking-tight mb-6">Services & Pricing</h2>
              <div className="space-y-6">
                  <div className="bg-surface-container/40 rounded-2xl p-6 border border-primary/10">
                    <h3 className="text-lg font-bold text-primary mb-4 border-b border-surface-variant pb-2">Consultation Prices</h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {doctor.isClinicEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-surface-variant/60 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaClinicMedical className="text-outline-variant text-xl" />
                          <div className="text-xs text-primary-light uppercase font-semibold tracking-wide">Clinic</div>
                          <div className="font-bold text-primary">{doctor.clinicPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isVideoEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-surface-variant/60 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaVideo className="text-outline-variant text-xl" />
                          <div className="text-xs text-primary-light uppercase font-semibold tracking-wide">Video</div>
                          <div className="font-bold text-primary">{doctor.videoPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isCallEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-surface-variant/60 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaPhone className="text-outline-variant text-xl" />
                          <div className="text-xs text-primary-light uppercase font-semibold tracking-wide">Voice</div>
                          <div className="font-bold text-primary">{doctor.callPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isChatEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-surface-variant/60 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaCommentDots className="text-outline-variant text-xl" />
                          <div className="text-xs text-primary-light uppercase font-semibold tracking-wide">Chat</div>
                          <div className="font-bold text-primary">{doctor.chatPrice} EGP</div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-primary/10 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-primary-dark tracking-tight">Patient Reviews {reviewsTotal > 0 && `(${reviewsTotal})`}</h2>
                {user?.activeRole?.toLowerCase() === "user" && (
                  <button
                    onClick={handleRateDoctor}
                    className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Rate this Doctor
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="flex justify-center py-8 text-primary">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : !reviews || reviews.length === 0 ? (
                  <p className="text-text-muted text-center py-8">No reviews available for this doctor yet.</p>
                ) : (
                  <>
                    {reviews?.map(review => (
                      <div key={review.reviewId} className="border-b border-surface-variant/60 last:border-0 pb-6 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-on-surface">{review.patientName}
                              {review.consultationType !== undefined && (
                                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] uppercase font-bold tracking-wider">
                                  {getConsultationTypeName(review.consultationType)}
                                </span>
                              )}
                              </div>
                            <div className="text-xs text-text-muted">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex text-yellow-400 text-sm">
                            {[...Array(5)].map((_, i) => (
                              <FaStar key={i} className={i < review.rating ? "" : "text-surface-variant"} />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-text-muted text-sm leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))}

                    {reviewsTotal > reviews?.length && (
                      <div className="flex justify-center pt-4 border-t border-surface-variant/60 gap-4 items-center">
                         <button
                           onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                           disabled={reviewsPage === 1}
                           className="text-sm font-semibold text-primary disabled:text-outline-variant cursor-pointer disabled:cursor-not-allowed hover:underline"
                         >
                           Previous
                         </button>
                         <span className="text-sm text-text-muted">Page {reviewsPage}</span>
                         <button
                           onClick={() => setReviewsPage(p => p + 1)}
                           disabled={reviewsPage * 5 >= reviewsTotal}
                           className="text-sm font-semibold text-primary disabled:text-outline-variant cursor-pointer disabled:cursor-not-allowed hover:underline"
                         >
                           Next
                         </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Actions & Booking */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Action Card */}
            {!isSelf && (
              <div className="bg-white rounded-3xl shadow-floating border border-primary/10 p-6 sticky top-24">
                <h3 className="text-xl font-bold text-primary-dark tracking-tight mb-6">Book an Appointment</h3>

                <div className="mb-6">
                  <button
                    onClick={handleOpenBookingModal}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-floating hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FaRegCalendarAlt /> Book an Appointment
                  </button>
                </div>

                <div className="space-y-3 pt-4 border-t border-surface-variant/60">
                  {doctor.isChatEnabled && (
                    <>
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-surface-variant"></div>
                        <span className="flex-shrink-0 mx-4 text-outline-variant text-sm">or</span>
                        <div className="flex-grow border-t border-surface-variant"></div>
                      </div>

                      <button
                        onClick={handleChatClick}
                        className="w-full bg-primary/10 text-primary-dark hover:bg-primary/15 font-bold py-3.5 rounded-xl border border-primary/20 transition-colors text-center flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FaCommentDots /> Start Chat Consultation
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {isSelf && (
              <div className="bg-surface-container/40 rounded-3xl border border-surface-variant p-6 text-center text-text-muted">
                <div className="text-4xl mb-4">👋</div>
                <h3 className="font-bold text-primary-dark mb-2">This is your public profile</h3>
                <p className="text-sm">Action buttons are hidden when viewing your own profile.</p>
              </div>
            )}
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
