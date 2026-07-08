import {
  MdDelete,
  MdVideocam,
  MdPhone,
  MdChat,
  MdLocalHospital,
} from "react-icons/md";
import { getConsultationTypeLabel } from "../../utils/appointmentUtils";

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
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.name}
                className="w-full h-full object-cover rounded-full"
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
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1.5 text-[11px] font-bold bg-surface-container-low border border-surface-variant/30 text-on-surface-variant px-3 py-1.5 rounded-lg">
          <BadgeIcon badge={item.badge} />
          {getConsultationTypeLabel(item.badge)}
        </span>
        <button
          onClick={() => onCancel(item.id)}
          disabled={cancelling}
          className="p-1.5 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 cursor-pointer"
          title="Cancel Appointment"
        >
          <MdDelete size={16} />
        </button>
      </div>
    </div>
  );
}
