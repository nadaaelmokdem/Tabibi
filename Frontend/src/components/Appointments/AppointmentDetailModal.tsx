import { format } from "date-fns";
import { Link } from "react-router-dom";
import { MdClose, MdAccessTime, MdChat } from "react-icons/md";
import { FaVideo } from "react-icons/fa";
import { formatMoney } from "../../utils/formatMoney";
import {
  type AppointmentListItem,
  getConsultationTypeIcon,
  getConsultationTypeLabel,
  getStatusLabel,
  getStatusBadgeClasses,
  canCancelAppointment,
  isChatConsultation,
  isVideoConsultation,
  MdCircle,
} from "../../utils/appointmentUtils";

interface AppointmentDetailModalProps {
  appointment: AppointmentListItem | null;
  partyLabel: "Doctor" | "Patient";
  partyName: string;
  onClose: () => void;
  onCancel?: (appointmentId: number) => void;
  cancelling?: boolean;
}

export default function AppointmentDetailModal({
  appointment,
  partyLabel,
  partyName,
  onClose,
  onCancel,
  cancelling = false,
}: AppointmentDetailModalProps) {
  if (!appointment) return null;

  const showChat = isChatConsultation(appointment.consultationType) && !!appointment.sessionId;
  const showJoinCall = isVideoConsultation(appointment.consultationType) && !!appointment.sessionId && getStatusLabel(appointment.status) === "Confirmed";
  const showCancel = onCancel && canCancelAppointment(appointment.status, appointment.paymentMethod);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-2xl border border-surface-variant overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-surface-variant bg-surface-container">
          <h2 className="text-lg font-bold text-primary-dark">Appointment Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-variant text-text-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <DetailRow label={partyLabel} value={partyName} />
          <DetailRow
            label="Date & Time"
            value={
              <>
                {format(new Date(appointment.scheduledAt), "MMM d, yyyy")}
                <span className="block text-sm text-text-muted mt-0.5 flex items-center gap-1">
                  <MdAccessTime size={13} />
                  {isChatConsultation(appointment.consultationType)
                    ? `Open till: ${format(new Date(new Date(appointment.scheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}`
                    : `${format(new Date(appointment.scheduledAt), "h:mm a")} · ${appointment.durationMins} mins`}
                </span>
              </>
            }
          />
          <DetailRow
            label="Type"
            value={
              <span className="inline-flex items-center gap-1.5">
                {getConsultationTypeIcon(appointment.consultationType, 14)}
                {getConsultationTypeLabel(appointment.consultationType)}
              </span>
            }
          />
          <DetailRow
            label="Status"
            value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-full font-bold border w-fit ${getStatusBadgeClasses(appointment.status)}`}>
                <MdCircle size={7} />
                {getStatusLabel(appointment.status)}
              </span>
            }
          />
          {appointment.price != null && (
            <DetailRow label="Price" value={formatMoney(appointment.price)} />
          )}
          {appointment.notes && (
            <DetailRow label="Notes" value={appointment.notes} />
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-surface-variant bg-surface-container/50 flex flex-col sm:flex-row gap-2 sm:justify-end">
          {showCancel && (
            <button
              onClick={() => onCancel!(appointment.appointmentId)}
              disabled={cancelling}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Appointment"}
            </button>
          )}
          {showChat && (
            <Link
              to={`/chat/${appointment.sessionId}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              <MdChat size={14} /> Open Chat
            </Link>
          )}
          {showJoinCall && (
            new Date() >= new Date(appointment.scheduledAt) ? (
              <Link
                to={`/video-call/${appointment.sessionId}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
              >
                <FaVideo size={14} /> Join Call
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary/50 text-white/70 font-semibold text-sm cursor-not-allowed"
                title={`This call will be available at ${format(new Date(appointment.scheduledAt), "h:mm a")}`}
              >
                <FaVideo size={14} /> Join Call
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-surface-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-variant transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-outline-variant mb-1">{label}</p>
      <div className="text-sm font-medium text-primary-dark">{value}</div>
    </div>
  );
}
