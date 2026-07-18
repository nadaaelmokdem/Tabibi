import {
  MdDelete,
  MdVideocam,
  MdPhone,
  MdChat,
  MdLocalHospital,
} from "react-icons/md";
import { Link } from "react-router-dom";
import { getFileUrl } from "../../utils/fileUtils";
import {
  getConsultationTypeLabel,
  isChatConsultation,
  isVideoConsultation,
} from "../../utils/appointmentUtils";

export interface ScheduleItem {
  id: number;
  time: string;
  duration: string;
  name: string;
  type: string;
  badge: string;
  date: string;
  initials: string;
  avatar?: string;
  paymentMethod?: string;
  sessionId?: number;
  scheduledAt?: string;
}

function BadgeIcon({ badge }: { badge: string }) {
  const label = getConsultationTypeLabel(badge);
  const iconClass = "text-primary";
  switch (label) {
    case "Video":
      return <MdVideocam size={12} className={iconClass} />;
    case "Call":
      return <MdPhone size={12} className={iconClass} />;
    case "Chat":
      return <MdChat size={12} className={iconClass} />;
    case "Clinic":
      return <MdLocalHospital size={12} className={iconClass} />;
    default:
      return <MdLocalHospital size={12} className={iconClass} />;
  }
}

export default function ScheduleItemComponent({
  item,
  onCancel,
  cancelling = false,
}: {
  item: ScheduleItem;
  onCancel: (id: number) => void;
  cancelling?: boolean;
}) {
  const isChat = isChatConsultation(item.badge);
  const isVideo = isVideoConsultation(item.badge);
  const isClinic = item.badge === "Clinic" || item.badge === "2";
  const isVideoJoinable = isVideo && item.sessionId && new Date() >= new Date(item.scheduledAt || "");

  return (
    <div className="group flex items-center justify-between p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/30">
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-center min-w-[60px] shrink-0">
          <div className="text-primary font-bold text-sm">{item.time}</div>
          <div className="text-[11px] text-on-surface-variant font-medium mt-1">
            {item.duration}
          </div>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm shadow-sm shrink-0 overflow-hidden">
            {item.avatar ? (
              <img
                src={getFileUrl(item.avatar)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              item.initials
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-on-surface text-sm truncate">{item.name}</div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{item.type}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isChat && item.sessionId ? (
          <Link
            to={`/chat/${item.sessionId}`}
            className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-xs font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          >
            <MdChat className="text-sm" />
            Open Chat
          </Link>
        ) : isVideo && item.sessionId ? (
          isVideoJoinable ? (
            <Link
              to={`/video-call/${item.sessionId}`}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-xs font-semibold hover:bg-primary-dark transition-colors shadow-sm"
            >
              <MdVideocam className="text-base" />
              Join Call
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/20 text-primary/50 cursor-not-allowed rounded-full text-xs font-semibold"
              title={`This call will be available at ${item.time}`}
            >
              <MdVideocam className="text-base" />
              Join Call
            </button>
          )
        ) : isClinic ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-semibold rounded-full uppercase tracking-wider">
            <MdLocalHospital className="text-xs" />
            Upcoming Clinic
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-surface-container-low border border-surface-variant/30 text-on-surface-variant px-3 py-1.5 rounded-lg">
            <BadgeIcon badge={item.badge} />
            {getConsultationTypeLabel(item.badge)}
          </span>
        )}

        {item.paymentMethod === "OnSite" && (
          <button
            onClick={() => onCancel(item.id)}
            disabled={cancelling}
            className="p-1.5 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 cursor-pointer"
            title="Cancel Appointment"
          >
            <MdDelete size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
