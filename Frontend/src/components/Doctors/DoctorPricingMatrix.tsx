import { FaVideo, FaCommentDots, FaClinicMedical } from "react-icons/fa";
import type { DoctorListItem } from "../../types/public";

interface DoctorPricingMatrixProps {
  doctor: DoctorListItem;
}

export default function DoctorPricingMatrix({ doctor }: DoctorPricingMatrixProps) {
  return (
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
              {doctor.isVideoCallEnabled && (
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-2 border border-surface-variant/60 hover:border-primary/30 transition-colors cursor-pointer">
                  <FaVideo className="text-outline-variant text-xl" />
                  <div className="text-xs text-primary-light uppercase font-semibold tracking-wide">Video</div>
                  <div className="font-bold text-primary">{doctor.videoCallPrice} EGP</div>
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
  );
}
