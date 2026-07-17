import { useState, useEffect } from "react";
import DoctorService from "../../services/doctorService";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { MdClear, MdAccessTime, MdChat } from "react-icons/md";
import { FaVideo } from "react-icons/fa";
import { LuCalendarDays } from "react-icons/lu";
import AppointmentFilters from "../../components/Appointments/AppointmentFilters";
import AppointmentDetailModal from "../../components/Appointments/AppointmentDetailModal";
import {
  type AppointmentListItem,
  getStatusBadgeClasses,
  isChatConsultation,
  isVideoConsultation,
  getConsultationTypeIcon,
  getConsultationTypeLabel,
  getStatusLabel,
  MdCircle,
} from "../../utils/appointmentUtils";

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", type: "", fromDate: "", toDate: "", search: "" });
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await DoctorService.getAppointments(filters);
      setAppointments(data);
    } catch {
      toast.error("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAppointments(); }, [filters]);

  const clearFilters = () => {
    setFilters({ status: "", type: "", fromDate: "", toDate: "", search: "" });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!window.confirm("Cancel this appointment? The patient will be notified.")) return;
    setCancelling(true);
    try {
      const updated = await DoctorService.cancelAppointment(appointmentId);
      setAppointments((prev) =>
        prev.map((a) => (a.appointmentId === appointmentId ? { ...a, ...updated } : a)),
      );
      setSelectedAppointment((prev) =>
        prev?.appointmentId === appointmentId ? { ...prev, ...updated } : prev,
      );
      toast.success("Appointment cancelled.");
    } catch {
      toast.error("Failed to cancel appointment.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="w-full bg-background p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Appointments</h1>
            <p className="text-sm text-text-muted mt-0.5">View and manage all your patient bookings.</p>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors">
              <MdClear size={16} /> Clear all filters
            </button>
          )}
        </div>

        {/* Filters Card */}
        <AppointmentFilters 
          filters={filters}
          setFilters={setFilters}
          hasActiveFilters={hasActiveFilters}
          searchLabel="Search Patient"
          searchPlaceholder="Type a patient name..."
        />

        {/* Results */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-variant overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-outline-variant">
              <LuCalendarDays className="mx-auto text-3xl mb-3 opacity-30" />
              Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-outline-variant space-y-2">
              <LuCalendarDays className="mx-auto text-4xl opacity-20 mb-3" />
              <p className="font-medium">No appointments found</p>
              <p className="text-sm">{hasActiveFilters ? "Try adjusting or clearing your filters." : "You have no appointments yet."}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Common Header */}
              <div className="px-6 py-3 bg-surface-container border-b border-surface-variant flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {appointments.length} result{appointments.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-on-surface-variant">
                  <thead className="bg-surface-container text-primary-dark uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Patient</th>
                      <th className="px-6 py-4 font-bold">Date & Time</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant">
                    {appointments.map((app) => (
                      <tr key={app.appointmentId} className="hover:bg-surface-container transition-colors group cursor-default">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {app.patientProfilePictureUrl ? (
                              <img src={app.patientProfilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-surface-variant" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {(app.patientName || "P")[0].toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-primary-dark">{app.patientName || "Patient"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-primary-dark">{format(new Date(app.scheduledAt), "MMM d, yyyy")}</div>
                          <div className="text-xs text-outline-variant mt-0.5 flex items-center gap-1">
                            <MdAccessTime size={11} />
                            {isChatConsultation(app.consultationType)
                              ? `Open till: ${format(new Date(new Date(app.scheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}`
                              : `${format(new Date(app.scheduledAt), "h:mm a")} · ${app.durationMins} mins`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full bg-primary/10 text-primary font-bold border border-primary/15 uppercase tracking-wide w-fit">
                            {getConsultationTypeIcon(app.consultationType)}
                            {getConsultationTypeLabel(app.consultationType)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-full font-bold border w-fit ${getStatusBadgeClasses(app.status)}`}>
                            <MdCircle size={7} />
                            {getStatusLabel(app.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isChatConsultation(app.consultationType) && app.sessionId ? (
                            <Link
                              to={`/chat/${app.sessionId}`}
                              className="flex items-center gap-1.5 text-white bg-primary hover:bg-primary-dark px-4 py-1.5 rounded-lg font-semibold text-sm transition-all shadow-sm group-hover:shadow-md w-fit"
                              title="Open the active chat session with this patient"
                            >
                              <MdChat size={14} /> Open Chat
                            </Link>
                          ) : isVideoConsultation(app.consultationType) && app.sessionId && getStatusLabel(app.status) === "Confirmed" ? (
                            new Date() >= new Date(app.scheduledAt) ? (
                              <Link
                                to={`/video-call/${app.sessionId}`}
                                className="flex items-center gap-1.5 text-white bg-primary hover:bg-primary-dark px-4 py-1.5 rounded-lg font-semibold text-sm transition-all shadow-sm group-hover:shadow-md w-fit"
                                title="Join the video call room"
                              >
                                <FaVideo size={14} /> Join Call
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-1.5 text-white/70 bg-primary/50 cursor-not-allowed px-4 py-1.5 rounded-lg font-semibold text-sm transition-all w-fit"
                                title={`This call will be available at ${format(new Date(app.scheduledAt), "h:mm a")}`}
                              >
                                <FaVideo size={14} /> Join Call
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => setSelectedAppointment(app)}
                              className="cursor-pointer text-primary bg-surface-container hover:bg-surface-variant px-4 py-1.5 rounded-lg font-semibold text-sm transition-all border border-surface-variant"
                              title="View full appointment details"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-surface-variant">
                {appointments.map((app) => (
                  <div key={app.appointmentId} className="p-4 hover:bg-surface-container transition-colors space-y-4">
                    {/* Header: Patient Info & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {app.patientProfilePictureUrl ? (
                          <img src={app.patientProfilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-variant" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {(app.patientName || "P")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-primary-dark text-base leading-tight">
                            {app.patientName || "Patient"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-bold border border-primary/15 uppercase tracking-wide">
                              {getConsultationTypeIcon(app.consultationType, 11)}
                              {getConsultationTypeLabel(app.consultationType)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full font-bold border shrink-0 ${getStatusBadgeClasses(app.status)}`}>
                        <MdCircle size={6} />
                        {getStatusLabel(app.status)}
                      </span>
                    </div>

                    {/* Date/Time Details Panel */}
                    <div className="bg-surface-container/50 rounded-xl p-3 text-xs text-on-surface-variant flex flex-col gap-1.5">
                      <div className="font-bold text-primary-dark flex items-center gap-1.5">
                        <LuCalendarDays size={13} className="text-primary" />
                        {format(new Date(app.scheduledAt), "MMMM d, yyyy")}
                      </div>
                      <div className="text-outline-variant flex items-center gap-1.5 font-medium">
                        <MdAccessTime size={13} className="text-primary" />
                        {isChatConsultation(app.consultationType)
                          ? `Open till: ${format(new Date(new Date(app.scheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}`
                          : `${format(new Date(app.scheduledAt), "h:mm a")} · ${app.durationMins} mins`}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end pt-1">
                      {isChatConsultation(app.consultationType) && app.sessionId ? (
                        <Link
                          to={`/chat/${app.sessionId}`}
                          className="flex items-center justify-center gap-1.5 text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm w-full text-center"
                          title="Open the active chat session with this patient"
                        >
                          <MdChat size={16} /> Open Chat
                        </Link>
                      ) : isVideoConsultation(app.consultationType) && app.sessionId && getStatusLabel(app.status) === "Confirmed" ? (
                        new Date() >= new Date(app.scheduledAt) ? (
                          <Link
                            to={`/video-call/${app.sessionId}`}
                            className="flex items-center justify-center gap-1.5 text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm w-full text-center"
                            title="Join the video call room"
                          >
                            <FaVideo size={16} /> Join Call
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center gap-1.5 text-white/70 bg-primary/50 cursor-not-allowed px-4 py-2 rounded-xl font-semibold text-sm transition-all w-full"
                            title={`This call will be available at ${format(new Date(app.scheduledAt), "h:mm a")}`}
                          >
                            <FaVideo size={16} /> Join Call
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setSelectedAppointment(app)}
                          className="cursor-pointer text-primary bg-surface-container hover:bg-surface-variant px-4 py-2 rounded-xl font-semibold text-sm transition-all border border-surface-variant w-full"
                          title="View full appointment details"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AppointmentDetailModal
        appointment={selectedAppointment}
        partyLabel="Patient"
        partyName={selectedAppointment?.patientName || "Patient"}
        onClose={() => setSelectedAppointment(null)}
        onCancel={handleCancelAppointment}
        cancelling={cancelling}
      />
    </div>
  );
}

