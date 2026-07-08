import { useState, useEffect } from "react";
import DoctorService from "../services/doctorService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import {
  MdSearch, MdFilterList, MdClear, MdAccessTime,
  MdLocalHospital, MdVideocam, MdPhone, MdChat,
  MdCircle,
} from "react-icons/md";
import { LuCalendarDays } from "react-icons/lu";

const TYPE_OPTIONS = [
  { value: "", label: "All",    icon: <MdAccessTime size={13} /> },
  { value: "0", label: "Clinic", icon: <MdLocalHospital size={13} /> },
  { value: "1", label: "Video",  icon: <MdVideocam size={13} /> },
  { value: "2", label: "Call",   icon: <MdPhone size={13} /> },
  { value: "3", label: "Chat",   icon: <MdChat size={13} /> },
];

const STATUS_OPTIONS = [
  { value: "",           label: "All",       color: "text-gray-400" },
  { value: "Pending",    label: "Pending",   color: "text-yellow-500" },
  { value: "Confirmed",  label: "Confirmed", color: "text-green-500" },
  { value: "Completed",  label: "Completed", color: "text-blue-500" },
  { value: "Cancelled",  label: "Cancelled", color: "text-red-500" },
];

const TYPE_LABELS = ["Clinic", "Video", "Call", "Chat"];
const APPT_STATUS = ["Pending", "Confirmed", "Completed", "Cancelled", "NoShow"];

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", type: "", fromDate: "", toDate: "", search: "" });

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

  useEffect(() => { fetchAppointments(); }, [filters]);

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
            <h1 className="text-2xl font-bold text-[#2A2455]">Appointments</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage all your patient bookings.</p>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors">
              <MdClear size={16} /> Clear all filters
            </button>
          )}
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
                <MdSearch size={13} /> Search Patient
              </label>
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="search"
                  placeholder="Type a patient name..."
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
                {TYPE_OPTIONS.map((opt) => {
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
              {filters.search && <Pill label={`Patient: "${filters.search}"`} onRemove={() => setFilters(f => ({ ...f, search: "" }))} />}
              {filters.status && <Pill label={`Status: ${filters.status}`} onRemove={() => setFilters(f => ({ ...f, status: "" }))} />}
              {filters.type !== "" && <Pill label={`Type: ${TYPE_LABELS[+filters.type]}`} onRemove={() => setFilters(f => ({ ...f, type: "" }))} />}
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
              <p className="text-sm">{hasActiveFilters ? "Try adjusting or clearing your filters." : "You have no appointments yet."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="px-6 py-3 bg-[#F8F7FF] border-b border-[#E6E1FF]">
                  <span className="text-xs font-bold text-[#6A5ACD] uppercase tracking-wider">{appointments.length} result{appointments.length !== 1 ? "s" : ""}</span>
                </div>
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-[#F8F7FF] text-[#2A2455] uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Patient</th>
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
                            {app.patientProfilePictureUrl ? (
                              <img src={app.patientProfilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#E6E1FF]" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6A5ACD] to-[#9B8DE8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {(app.patientName || "P")[0].toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-gray-800">{app.patientName || "Patient"}</span>
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
                            {TYPE_OPTIONS.find(t => t.value === String(app.consultationType))?.icon}
                            {TYPE_LABELS[app.consultationType] || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider rounded-full font-bold border w-fit ${
                            app.status === 0 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                            app.status === 1 ? "bg-green-50 text-green-700 border-green-200" :
                            app.status === 2 ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            <MdCircle size={7} />
                            {APPT_STATUS[app.status] ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {app.consultationType === 3 && app.sessionId ? (
                            <button
                              onClick={() => window.location.href = `/chat/${app.sessionId}`}
                              className="cursor-pointer flex items-center gap-1.5 text-white bg-[#6A5ACD] hover:bg-[#5140b3] px-4 py-1.5 rounded-lg font-semibold text-sm transition-all shadow-sm group-hover:shadow-md"
                              title="Open the active chat session with this patient"
                            >
                              <MdChat size={14} /> Open Chat
                            </button>
                          ) : (
                            <button
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
