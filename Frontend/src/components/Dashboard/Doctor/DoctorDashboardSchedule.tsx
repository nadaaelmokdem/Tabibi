import { MdChevronRight, MdEventBusy, MdSchedule } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import ScheduleItemComponent, { type ScheduleItem } from "../../../components/DoctorDashboard/ScheduleItem";
import type { DoctorDashboardData } from "../../../types/dashboard";

interface DoctorDashboardScheduleProps {
  dashboardData: DoctorDashboardData | null;
  mappedSchedule: ScheduleItem[];
  isVerified: boolean;
  cancellingId: number | null;
  handleCancelAppointment: (id: number) => void;
  setIsCalendarOpen: (open: boolean) => void;
}

export default function DoctorDashboardSchedule({
  dashboardData,
  mappedSchedule,
  isVerified,
  cancellingId,
  handleCancelAppointment,
  setIsCalendarOpen
}: DoctorDashboardScheduleProps) {
  const navigate = useNavigate();

  return (
    <div className="col-span-1 md:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border border-surface-variant/30 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-on-surface">Active Consultations</h2>
          {(dashboardData?.activeConsultationsCount ?? 0) > 0 && (
            <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {dashboardData?.activeConsultationsCount} active
            </span>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => navigate("/doctor-appointments")}
            className="cursor-pointer text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="cursor-pointer text-sm font-medium text-primary flex items-center gap-0.5 hover:underline"
          >
            Calendar <MdChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {mappedSchedule.length > 0 ? (
          mappedSchedule.map((item, i) => (
            <div key={item.id}>
              <ScheduleItemComponent
                item={item}
                onCancel={handleCancelAppointment}
                cancelling={cancellingId === item.id}
              />
              {i < mappedSchedule.length - 1 && (
                <hr className="border-surface-variant/30 mt-4" />
              )}
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-8">
            <MdEventBusy className="text-4xl text-on-surface-variant/30 mb-2" />
            <p className="text-sm text-on-surface-variant/80 text-center mb-4">
              {isVerified
                ? "No active consultations."
                : "Appointments will appear here once your profile is verified."}
            </p>
            <button
              onClick={() => navigate("/doctor-availability")}
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <MdSchedule className="text-lg" />
              Set availability
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
