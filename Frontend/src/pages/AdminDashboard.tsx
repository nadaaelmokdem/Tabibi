import { useEffect, useState } from "react";
import {
  MdPeopleAlt,
  MdMedicalServices,
  MdPendingActions,
  MdEventNote,
} from "react-icons/md";
import StatCard from "../components/DoctorDashboard/StatCard";
import AdminService from "../services/adminService";
import type { AdminDashboardData } from "../types/dashboard";

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    AdminService.getDashboard()
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }

  async function handleVerify(doctorId: number, approve: boolean) {
    setActioningId(doctorId);
    try {
      await AdminService.verifyDoctor(doctorId, approve);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-[#2A2455]/60">Loading...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-[#2A2455]/60">
        Couldn't load dashboard. {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A2455]">Admin overview</h1>
        <p className="text-[#2A2455]/60 text-sm">
          Platform health and pending actions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Patients" value={data.totalPatients} icon={MdPeopleAlt} isPrimary />
        <StatCard title="Doctors" value={data.totalDoctors} icon={MdMedicalServices} />
        <StatCard
          title="Pending verifications"
          value={data.pendingDoctorVerifications}
          icon={MdPendingActions}
        />
        <StatCard title="Total appointments" value={data.totalAppointments} icon={MdEventNote} />
      </div>

      <section className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
        <h2 className="text-lg font-bold text-[#2A2455] mb-3">
          Doctor verification queue
        </h2>
        {data.pendingDoctors.length === 0 ? (
          <p className="text-sm text-gray-400">
            No doctors waiting on verification.
          </p>
        ) : (
          <ul className="divide-y divide-[#F4F1FF]">
            {data.pendingDoctors.map((d) => (
              <li
                key={d.doctorId}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[#2A2455]">{d.fullName}</p>
                  <p className="text-sm text-[#2A2455]/60">
                    License {d.licenseNumber} · {d.clinicLocation}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={actioningId === d.doctorId}
                    onClick={() => handleVerify(d.doctorId, true)}
                    className="rounded-lg bg-[#6A5ACD] px-3 py-1 text-sm text-white hover:bg-[#5b4dc0] disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={actioningId === d.doctorId}
                    onClick={() => handleVerify(d.doctorId, false)}
                    className="rounded-lg bg-[#F4F1FF] px-3 py-1 text-sm text-[#2A2455] hover:bg-[#E6E1FF] disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
