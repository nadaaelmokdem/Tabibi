import { useState, useEffect } from "react";
import PatientService from "../services/patientService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { MdSearch, MdFilterList, MdClear, MdAccessTime, MdChat } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { LuCalendarDays } from "react-icons/lu";
import AppointmentDetailModal from "../components/Appointments/AppointmentDetailModal";
import {
  CONSULTATION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  type AppointmentListItem,
  getConsultationTypeIcon,
  getConsultationTypeLabel,
  getStatusLabel,
  getStatusBadgeClasses,
  isChatConsultation,
  MdCircle,
} from "../utils/appointmentUtils";

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", type: "", fromDate: "", toDate: "", search: "" });
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await PatientService.getAppointments(filters);
      setAppointments(data);
    } catch {
      toast.error("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [filters, user?.id, user?.activeRole]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ status: "", type: "", fromDate: "", toDate: "", search: "" });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="w-full bg-[#FBFAFF] p-4 md:p-8 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-[#2A2455]">My Appointments</h1>
            <p className="text-sm text-gray-500 mt-0.5">View all your past and upcoming consultations.</p>
          </div>
          <div className="flex gap-3 items-center">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors">
                <MdClear size={16} /> Clear filters
              </button>
            )}
            <button
              onClick={() => navigate("/doctors")}
              className="cursor-pointer flex items-center gap-2 px-5 py-2 bg-[#6A5ACD] text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-[#5140b3] transition-all"
            >
              + Book New
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6E1FF] p-5 space-y-5">
          <div className="flex items-center gap-2 text-[#6A5ACD] font-semibold text-sm">
            <MdFilterList size={18} />
            <span>Filter Appointments</span>
          </div>

          {/* Top row of inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <MdSearch size={13} /> Search Doctor
              </label>
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="search"
                  placeholder="Type a doctor name..."
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-[#FBFAFF] focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
                />
              </div>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <LuCalendarDays size={13} /> From Date
              </label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-[#FBFAFF] focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <LuCalendarDays size={13} /> To Date
              </label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-[#FBFAFF] focus:outline-none focus:border-[#6A5ACD] focus:ring-2 focus:ring-[#6A5ACD]/20 transition"
              />
            </div>
          </div>

          {/* Bottom row of pill selections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {/* Status pills */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = filters.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFilters(f => ({ ...f, status: opt.value }))}
                      className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        active
                          ? "bg-[#6A5ACD] text-white border-[#6A5ACD] shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#6A5ACD] hover:text-[#6A5ACD]"
                      }`}
                    >
                      <MdCircle size={8} className={active ? "text-white" : opt.color} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type pills */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Consultation Type</label>
              <div className="flex flex-wrap gap-2">
                {CONSULTATION_TYPE_OPTIONS.map((opt) => {
                  const active = filters.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFilters(f => ({ ...f, type: opt.value }))}
                      className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        active
                          ? "bg-[#6A5ACD] text-white border-[#6A5ACD] shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#6A5ACD] hover:text-[#6A5ACD]"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
              <span className="text-xs text-gray-400 font-medium mt-1">Active:</span>
              {filters.search && <Pill label={`Doctor: "${filters.search}"`} onRemove={() => setFilters(f => ({ ...f, search: "" }))} />}
              {filters.status && <Pill label={`Status: ${filters.status}`} onRemove={() => setFilters(f => ({ ...f, status: "" }))} />}
              {filters.type !== "" && <Pill label={`Type: ${getConsultationTypeLabel(filters.type)}`} onRemove={() => setFilters(f => ({ ...f, type: "" }))} />}
              {filters.fromDate && <Pill label={`From: ${format(new Date(filters.fromDate), "MMM d, yyyy")}`} onRemove={() => setFilters(f => ({ ...f, fromDate: "" }))} />}
              {filters.toDate && <Pill label={`To: ${format(new Date(filters.toDate), "MMM d, yyyy")}`} onRemove={() => setFilters(f => ({ ...f, toDate: "" }))} />}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6E1FF] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <LuCalendarDays className="mx-auto text-3xl mb-3 opacity-30" />
              Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <LuCalendarDays className="mx-auto text-4xl opacity-20 mb-3" />
              <p className="font-medium">No appointments found</p>
              {hasActiveFilters ? (
                <p className="text-sm">Try adjusting or clearing your filters.</p>
              ) : (
                <>
                  <p className="text-sm">You haven't booked any appointments yet.</p>
                  <Link to="/doctors" className="inline-block mt-2 px-5 py-2 bg-[#6A5ACD] text-white rounded-xl font-semibold text-sm hover:bg-[#5140b3] transition-all">
                    Find a Doctor
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="px-6 py-3 bg-[#F8F7FF] border-b border-[#E6E1FF]">
                  <span className="text-xs font-bold text-[#6A5ACD] uppercase tracking-wider">
                    {appointments.length} result{appointments.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-[#F8F7FF] text-[#2A2455] uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Doctor</th>
                      <th className="px-6 py-4 font-bold">Date & Time</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((app) => (
                      <tr key={app.appointmentId} className="hover:bg-[#F8F7FF] transition-colors group cursor-default">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {app.doctorProfilePictureUrl ? (
                              <img src={`http://localhost:5124${app.doctorProfilePictureUrl}`} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#E6E1FF]" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A5ACD] to-[#9B8DE8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {(app.doctorName || "D")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="font-semibold text-gray-800">
                              <Link to={`/doctors/${app.doctorId}`} className="hover:underline hover:text-[#6A5ACD]">
                                {(app.doctorName || "").startsWith("Dr.") ? app.doctorName : `Dr. ${app.doctorName || "Doctor"}`}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">{format(new Date(app.scheduledAt), "MMM d, yyyy")}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MdAccessTime size={11} />
                            {format(new Date(app.scheduledAt), "h:mm a")} · {app.durationMins} mins
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 uppercase tracking-wide w-fit">
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
                              className="flex items-center gap-1.5 text-white bg-[#6A5ACD] hover:bg-[#5140b3] px-4 py-1.5 rounded-lg font-semibold text-sm transition-all shadow-sm group-hover:shadow-md w-fit"
                              title="Open your active chat session with this doctor"
                            >
                              <MdChat size={14} /> Open Chat
                            </Link>
                          ) : (
                            <button
                              onClick={() => setSelectedAppointment(app)}
                              className="cursor-pointer text-[#6A5ACD] bg-[#F8F7FF] hover:bg-[#E6E1FF] px-4 py-1.5 rounded-lg font-semibold text-sm transition-all border border-[#E6E1FF]"
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
            </div>
          )}
        </div>
      </div>

      <AppointmentDetailModal
        appointment={selectedAppointment}
        partyLabel="Doctor"
        partyName={
          selectedAppointment
            ? (selectedAppointment.doctorName || "").startsWith("Dr.")
              ? selectedAppointment.doctorName!
              : `Dr. ${selectedAppointment.doctorName || "Doctor"}`
            : ""
        }
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-[#F0EEFF] text-[#6A5ACD] text-xs font-semibold rounded-full border border-[#D0C9FF]">
      {label}
      <button onClick={onRemove} className="cursor-pointer hover:text-red-500 transition-colors ml-0.5">
        <MdClear size={12} />
      </button>
    </span>
  );
}
