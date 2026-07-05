import { useEffect, useState } from "react";
import {
  MdCalendarMonth,
  MdChatBubbleOutline,
  MdDescription,
} from "react-icons/md";
import StatCard from "../components/DoctorDashboard/StatCard";
import PatientService from "../services/patientService";
import type { PatientDashboardData } from "../types/dashboard";

export default function PatientDashboard() {
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PatientService.getDashboard()
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-[#2A2455]/60">Loading your dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-[#2A2455]/60">
        Couldn't load your dashboard. {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A2455]">
          Welcome back, {data.fullName}
        </h1>
        <p className="text-[#2A2455]/60 text-sm">
          Here's what's happening with your care.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Upcoming appointments"
          value={data.upcomingAppointmentsCount}
          icon={MdCalendarMonth}
          isPrimary
        />
        <StatCard
          title="Pending chat requests"
          value={data.pendingChatSessionsCount}
          icon={MdChatBubbleOutline}
        />
        <StatCard
          title="Recent prescriptions"
          value={data.recentPrescriptions.length}
          icon={MdDescription}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="/ai-chat"
          className="flex-1 block bg-[#6A5ACD] text-white rounded-2xl px-6 py-4 text-center text-lg font-semibold shadow-sm hover:bg-[#5b4dc0] transition"
        >
          Start an AI symptom check
        </a>
        <a
          href="/doctors"
          className="flex-1 block bg-white border-2 border-[#6A5ACD] text-[#6A5ACD] rounded-2xl px-6 py-4 text-center text-lg font-semibold shadow-sm hover:bg-[#F4F1FF] transition"
        >
          Find doctors
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
          <h2 className="text-lg font-bold text-[#2A2455] mb-3">
            Upcoming appointments
          </h2>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-gray-400">
              No upcoming appointments yet. Book one from a doctor's profile.
            </p>
          ) : (
            <ul className="divide-y divide-[#F4F1FF]">
              {data.upcomingAppointments.map((a) => (
                <li key={a.appointmentId} className="py-3">
                  <p className="font-semibold text-[#2A2455]">{a.doctorName}</p>
                  <p className="text-sm text-[#2A2455]/60">
                    {a.consultationType} ·{" "}
                    {new Date(a.scheduledAt).toLocaleString()}
                  </p>
                  <span className="inline-block mt-1 text-xs font-semibold bg-[#F4F1FF] text-[#6A5ACD] px-2 py-0.5 rounded-full">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
          <h2 className="text-lg font-bold text-[#2A2455] mb-3">
            Recent prescriptions
          </h2>
          {data.recentPrescriptions.length === 0 ? (
            <p className="text-sm text-gray-400">No prescriptions yet.</p>
          ) : (
            <ul className="divide-y divide-[#F4F1FF]">
              {data.recentPrescriptions.map((p) => (
                <li key={p.prescriptionId} className="py-3">
                  <p className="font-semibold text-[#2A2455]">{p.doctorName}</p>
                  <p className="text-sm text-[#2A2455]/60">
                    {new Date(p.issuedAt).toLocaleDateString()}
                  </p>
                  {p.diagnosis && (
                    <p className="text-sm text-[#2A2455]/80 mt-1">{p.diagnosis}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
