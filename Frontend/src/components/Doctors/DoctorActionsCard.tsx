import { FaRegCalendarAlt, FaVideo, FaCommentDots } from "react-icons/fa";
import type { DoctorListItem } from "../../types/public";

interface DoctorActionsCardProps {
  doctor: DoctorListItem;
  isSelf: boolean;
  handleOpenBookingModal: () => void;
  handleStartVideoCall: () => void;
  handleChatClick: () => void;
}

export default function DoctorActionsCard({
  doctor,
  isSelf,
  handleOpenBookingModal,
  handleStartVideoCall,
  handleChatClick
}: DoctorActionsCardProps) {
  if (isSelf) {
    return (
      <div className="bg-surface-container/40 rounded-3xl border border-surface-variant p-6 text-center text-text-muted">
        <div className="text-4xl mb-4">👋</div>
        <h3 className="font-bold text-primary-dark mb-2">This is your public profile</h3>
        <p className="text-sm">Action buttons are hidden when viewing your own profile.</p>
      </div>
    );
  }

  return (
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
        {doctor.isVideoCallEnabled && (
          <button
            onClick={handleStartVideoCall}
            className="w-full bg-green-50 text-green-700 hover:bg-green-100 font-bold py-3.5 rounded-xl border border-green-200 transition-colors text-center flex items-center justify-center gap-2 cursor-pointer mb-3"
          >
            <FaVideo /> Start Video Call
          </button>
        )}
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
  );
}
