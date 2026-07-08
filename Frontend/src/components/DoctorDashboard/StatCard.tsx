import type { StatCardProps } from "../../types/dashboardProps";

export default function StatCard({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  isPrimary,
  onClick,
}: StatCardProps & { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-xl shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      } ${
        isPrimary
          ? "bg-primary text-on-primary border-primary/20"
          : "bg-surface-container-lowest border-surface-variant/30"
      }`}
    >
      <div
        className={`flex justify-between items-start mb-2 ${
          isPrimary ? "opacity-90" : "text-on-surface-variant"
        }`}
      >
        <span className="text-sm font-medium">{title}</span>
        <div
          className={`p-2 rounded-xl ${
            isPrimary ? "bg-white/20" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <div
          className={`font-bold ${isPrimary ? "text-4xl" : "text-3xl text-on-surface"}`}
        >
          {value}
        </div>
        {trend && (
          <span className="text-xs font-bold text-green-500">{trend}</span>
        )}
      </div>
      {subtext && (
        <div
          className={`text-xs mt-2 ${isPrimary ? "text-white/80" : "text-on-surface-variant"}`}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
