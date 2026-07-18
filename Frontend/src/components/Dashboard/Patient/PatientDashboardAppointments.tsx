import { MdCalendarToday, MdEventBusy, MdChat, MdVideocam, MdLocalHospital } from "react-icons/md";
import { useNavigate, Link } from "react-router-dom";
import { CARD_BASE } from "./PatientDashboardHeader";
import { CachedImage } from "../../../components/common/CachedImage";
import { getFileUrl } from "../../../utils/fileUtils";
import { formatTimeTo12Hour } from "../../../utils/dateUtils";
import {
  isChatConsultation,
  isVideoConsultation,
  getConsultationTypeIcon,
  getConsultationTypeLabel,
} from "../../../utils/appointmentUtils";

interface PatientDashboardAppointmentsProps {
  activeConsultations: any[];
  activeConsultationsCount: number;
}

export default function PatientDashboardAppointments({
  activeConsultations,
  activeConsultationsCount
}: PatientDashboardAppointmentsProps) {
  const navigate = useNavigate();

  return (
    <div className={`col-span-1 md:col-span-6 lg:col-span-6 bg-surface-container-lowest ${CARD_BASE} p-6 flex flex-col`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-on-surface">Active Consultations</h2>
          {activeConsultationsCount > 0 && (
            <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {activeConsultationsCount} active
            </span>
          )}
        </div>
        <button onClick={() => navigate('/patient-appointments')} className="cursor-pointer text-sm font-medium text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4 flex-1">
        {activeConsultations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8">
            <MdEventBusy className="text-4xl text-on-surface-variant/30 mb-2" />
            <p className="text-sm text-on-surface-variant/80 text-center mb-4">
              No active consultations yet.
            </p>
            <button onClick={() => navigate('/doctors')} className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors">
              <MdCalendarToday className="text-lg" />
              Book an appointment
            </button>
          </div>
        ) : (
          activeConsultations.map((a, i) => {
            const isChat = isChatConsultation(a.consultationType);
            const isVideo = isVideoConsultation(a.consultationType);
            const isClinic = a.consultationType === "Clinic" || a.consultationType === 2;

            const isVideoJoinable = isVideo && a.sessionId && new Date() >= new Date(a.scheduledAt);

            return (
              <div key={a.appointmentId}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/60">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {a.doctorProfilePictureUrl ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm shrink-0">
                        <CachedImage
                          src={getFileUrl(a.doctorProfilePictureUrl)}
                          alt={a.doctorName || "Doctor"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-sm text-lg font-bold shrink-0">
                        {(a.doctorName || "D").replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || "D"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base text-on-surface font-semibold truncate">
                        {(a.doctorName || "").startsWith("Dr.") ? a.doctorName : `Dr. ${a.doctorName || "Doctor"}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-on-surface-variant flex items-center gap-1.5">
                          {getConsultationTypeIcon(a.consultationType, 14)}
                          {getConsultationTypeLabel(a.consultationType)}
                        </span>
                        <span className="text-xs text-outline-variant">•</span>
                        <span className="text-sm text-on-surface-variant">
                          {new Date(a.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}, {formatTimeTo12Hour(new Date(a.scheduledAt))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {isChat && a.sessionId ? (
                      <Link
                        to={`/chat/${a.sessionId}`}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
                      >
                        <MdChat className="text-base" />
                        Open Chat
                      </Link>
                    ) : isVideo && a.sessionId ? (
                      isVideoJoinable ? (
                        <Link
                          to={`/video-call/${a.sessionId}`}
                          className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
                        >
                          <MdVideocam className="text-lg" />
                          Join Call
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/20 text-primary/50 cursor-not-allowed rounded-full text-sm font-semibold"
                          title={`This call will be available at ${formatTimeTo12Hour(new Date(a.scheduledAt))}`}
                        >
                          <MdVideocam className="text-lg" />
                          Join Call
                        </button>
                      )
                    ) : isClinic ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-full uppercase tracking-wider">
                        <MdLocalHospital className="text-sm" />
                        Upcoming Clinic
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full">
                        {a.status}
                      </span>
                    )}
                  </div>
                </div>
                {i < activeConsultations.length - 1 && <hr className="border-surface-variant/60 mt-4" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
