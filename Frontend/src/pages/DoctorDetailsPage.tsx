import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaStar, FaMapMarkerAlt, FaBriefcase, FaVideo, FaCommentDots, FaPhone, FaClinicMedical, FaRegCalendarAlt, FaChevronLeft } from "react-icons/fa";
import PublicService from "../services/publicService";
import type { DoctorListItem } from "../types/public";
import { useAuth } from "../context/AuthContext";
import ChatService from "../services/chatService";
import Swal from "sweetalert2";
import { getAiQuota } from "../services/AIChat";
import AppointmentService from "../services/appointmentService";
import type { AvailableSlot } from "../types/appointment";
import { ConsultationType } from "../types/appointment";
import { formatTimeTo12Hour } from "../utils/dateUtils";

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [doctor, setDoctor] = useState<DoctorListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeGpMessages, setFreeGpMessages] = useState<number>(0);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
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
      setFreeGpMessages(0);
    }
  }, [isAuthenticated, user?.id, user?.activeRole]);

  useEffect(() => {
    if (doctor && selectedDate) {
      setSlotsLoading(true);
      AppointmentService.getAvailableSlots(doctor.doctorId, selectedDate)
        .then(slots => {
          setAvailableSlots(slots);
        })
        .catch(console.error)
        .finally(() => setSlotsLoading(false));
    }
  }, [doctor, selectedDate]);

  useEffect(() => {
    if (doctor) {
      setReviewsLoading(true);
      PublicService.getDoctorReviews(doctor.doctorId, reviewsPage, 5)
        .then(res => {
          setReviews(res.items);
          setReviewsTotal(res.totalCount);
        })
        .catch(console.error)
        .finally(() => setReviewsLoading(false));
    }
  }, [doctor, reviewsPage]);

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
      const sessionId = await ChatService.startSession(doctor.doctorId, isCompanyPaid, assessment);
      navigate(`/chat/${sessionId}`);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot start chat',
        text: err.response?.data || "Failed to start chat session.",
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

  const handleSlotClick = (slot: AvailableSlot) => {
    if (!slot.isAvailable || !doctor) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: `/doctors/${doctor.doctorId}` } });
      return;
    }
    if (user?.activeRole?.toLowerCase() === "doctor") {
      alert("Doctors cannot book appointments.");
      return;
    }

    const optionsHtml = [];
    if (doctor.isClinicEnabled) optionsHtml.push(`<option value="${ConsultationType.Clinic}">Clinic Visit (${doctor.clinicPrice} EGP)</option>`);
    if (doctor.isVideoEnabled) optionsHtml.push(`<option value="${ConsultationType.Video}">Video Call (${doctor.videoPrice} EGP)</option>`);
    if (doctor.isCallEnabled) optionsHtml.push(`<option value="${ConsultationType.Call}">Voice Call (${doctor.callPrice} EGP)</option>`);
    
    if (optionsHtml.length === 0) {
      Swal.fire('Error', 'This doctor has no bookable consultation types.', 'error');
      return;
    }

    const timeString = formatTimeTo12Hour(new Date(slot.start));

    Swal.fire({
      title: 'Book Appointment',
      html: `
        <div class="text-left mb-4">
          <p class="font-semibold text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span class="text-gray-500 text-sm block mb-1">Time</span>
            <span class="text-primary text-lg">${timeString}</span>
          </p>
          <label class="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Consultation Type</label>
          <select id="swal-type" class="w-full border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary p-3 border mb-4 bg-gray-50 font-medium text-gray-700 outline-none transition-all">
            ${optionsHtml.join('')}
          </select>
          <label class="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Chief Complaint <span class="text-gray-400 font-normal">(Optional)</span></label>
          <textarea id="swal-complaint" rows="3" class="w-full border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary p-3 border bg-gray-50 font-medium text-gray-700 outline-none transition-all resize-none" placeholder="Briefly describe your symptoms..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirm Booking',
      buttonsStyling: false,
      customClass: {
        popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100',
        title: 'text-2xl font-bold mb-4 text-gray-800 text-left w-full',
        htmlContainer: 'w-full m-0',
        confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-2 cursor-pointer',
        cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
      },
      preConfirm: () => {
        return {
          type: parseInt((document.getElementById('swal-type') as HTMLSelectElement).value),
          complaint: (document.getElementById('swal-complaint') as HTMLTextAreaElement).value
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        AppointmentService.bookAppointment({
          doctorId: doctor.doctorId,
          scheduledAt: slot.start,
          type: result.value.type as any,
          chiefComplaint: result.value.complaint
        }).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Appointment Booked!',
            text: 'Your appointment has been confirmed.',
            buttonsStyling: false,
            customClass: {
              popup: 'bg-white p-6 rounded-3xl shadow-2xl max-w-sm border border-gray-100',
              title: 'text-2xl font-bold mb-2 text-gray-800',
              htmlContainer: 'text-gray-600 mb-6',
              confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl cursor-pointer',
            }
          }).then(() => {
            navigate('/user-dashboard');
          });
        }).catch(err => {
          Swal.fire({
            icon: 'error',
            title: 'Booking Failed',
            text: err.response?.data?.message || err.message || 'Failed to book appointment',
            buttonsStyling: false,
            customClass: {
              popup: 'bg-white p-6 rounded-3xl shadow-2xl max-w-sm border border-gray-100',
              title: 'text-2xl font-bold mb-2 text-gray-800',
              htmlContainer: 'text-gray-600 mb-6',
              confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl cursor-pointer',
            }
          });
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">{error || "Doctor not found"}</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline flex items-center gap-2">
          <FaChevronLeft /> Go Back
        </button>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/doctors')} 
          className="text-gray-500 hover:text-primary font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <FaChevronLeft /> Back to Doctors
        </button>

        {/* Header / Basic Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="shrink-0 relative">
            {doctor.profilePictureUrl ? (
              <img
                src={doctor.profilePictureUrl}
                alt={doctor.fullName}
                className="w-40 h-40 rounded-2xl object-cover shadow-lg border-4 border-white"
              />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-5xl font-bold shadow-lg border-4 border-white">
                {doctor.fullName.charAt(0)}
              </div>
            )}
            {isSelf && (
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                You
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
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
                <span className="text-xs text-gray-500 font-medium">Rating</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-gray-600 font-medium text-sm">
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
                <h3 className="font-bold text-gray-800 mb-1">About</h3>
                <p className="text-gray-600 leading-relaxed">{doctor.bio}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Specialties & Pricing Matrix */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Services & Pricing</h2>
              <div className="space-y-6">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-primary mb-4 border-b border-gray-200 pb-2">Consultation Prices</h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {doctor.isClinicEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-gray-50 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaClinicMedical className="text-gray-400 text-xl" />
                          <div className="text-xs text-gray-500 uppercase font-semibold">Clinic</div>
                          <div className="font-bold text-primary">{doctor.clinicPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isVideoEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-gray-50 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaVideo className="text-gray-400 text-xl" />
                          <div className="text-xs text-gray-500 uppercase font-semibold">Video</div>
                          <div className="font-bold text-primary">{doctor.videoPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isCallEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-gray-50 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaPhone className="text-gray-400 text-xl" />
                          <div className="text-xs text-gray-500 uppercase font-semibold">Voice</div>
                          <div className="font-bold text-primary">{doctor.callPrice} EGP</div>
                        </div>
                      )}
                      {doctor.isChatEnabled && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-gray-50 hover:border-primary/30 transition-colors cursor-pointer">
                          <FaCommentDots className="text-gray-400 text-xl" />
                          <div className="text-xs text-gray-500 uppercase font-semibold">Chat</div>
                          <div className="font-bold text-primary">{doctor.chatPrice} EGP</div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Patient Reviews {reviewsTotal > 0 && `(${reviewsTotal})`}</h2>
              </div>
              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="flex justify-center py-8 text-primary">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No reviews available for this doctor yet.</p>
                ) : (
                  <>
                    {reviews.map(review => (
                      <div key={review.reviewId} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-gray-800">{review.patientName}</div>
                            <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex text-yellow-400 text-sm">
                            {[...Array(5)].map((_, i) => (
                              <FaStar key={i} className={i < review.rating ? "" : "text-gray-200"} />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))}
                    
                    {reviewsTotal > reviews.length && (
                      <div className="flex justify-center pt-4 border-t border-gray-100 gap-4 items-center">
                         <button 
                           onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                           disabled={reviewsPage === 1}
                           className="text-sm font-semibold text-primary disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed hover:underline"
                         >
                           Previous
                         </button>
                         <span className="text-sm text-gray-500">Page {reviewsPage}</span>
                         <button 
                           onClick={() => setReviewsPage(p => p + 1)}
                           disabled={reviewsPage * 5 >= reviewsTotal}
                           className="text-sm font-semibold text-primary disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed hover:underline"
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
              <div className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-primary/10 p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Book an Appointment</h3>
                
                {/* Live Timeslots */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaRegCalendarAlt className="text-primary/60" /> Select Date
                    </label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-700 font-medium"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                       Available Slots
                    </div>
                    {slotsLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map((slot, sIdx) => {
                          const timeString = formatTimeTo12Hour(new Date(slot.start));
                          return (
                            <button 
                              key={sIdx} 
                              disabled={!slot.isAvailable}
                              onClick={() => handleSlotClick(slot)}
                              className={`text-xs font-medium py-2.5 px-3 rounded-lg transition-all ${
                                slot.isAvailable 
                                  ? "bg-primary/5 hover:bg-primary hover:text-white border border-primary/20 hover:border-primary text-primary cursor-pointer shadow-sm"
                                  : "bg-gray-50 border border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                              }`}
                            >
                              {timeString}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                        No slots available on this date.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {doctor.isChatEnabled && (
                    <>
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      <button 
                        onClick={handleChatClick}
                        className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold py-3.5 rounded-xl border border-purple-200 transition-colors text-center flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FaCommentDots /> Start Chat Consultation
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {isSelf && (
              <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 text-center text-gray-500">
                <div className="text-4xl mb-4">👋</div>
                <h3 className="font-bold text-gray-700 mb-2">This is your public profile</h3>
                <p className="text-sm">Action buttons are hidden when viewing your own profile.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
