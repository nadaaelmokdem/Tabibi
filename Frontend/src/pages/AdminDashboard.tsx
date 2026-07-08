import { useEffect, useState } from "react";
import {
  MdPeopleAlt,
  MdMedicalServices,
  MdPendingActions,
  MdEventNote,
} from "react-icons/md";
import StatCard from "../components/DoctorDashboard/StatCard";
import AdminService from "../services/adminService";
import UsersTab from "../components/AdminDashboard/UsersTab";
import DoctorVerificationTab from "../components/AdminDashboard/DoctorVerificationTab";
import AppointmentsTab from "../components/AdminDashboard/AppointmentsTab";
import type { AdminDashboardData } from "../types/dashboard";
import Skeleton from "../components/common/Skeleton";
import NetworkError from "../components/common/NetworkError";

const TABS = ["Overview", "Users", "Doctor Verification", "Appointments & Payments"] as const;
type Tab = (typeof TABS)[number];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab !== "Overview") return;
    setLoading(true);
    AdminService.getDashboard()
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2A2455]">Admin overview</h1>
        <p className="text-[#2A2455]/60 text-sm">
          Platform health, doctor verification, and oversight.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[#E6E1FF] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#6A5ACD] text-[#6A5ACD]"
                : "border-transparent text-[#2A2455]/60 hover:text-[#2A2455]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {error && !loading && <NetworkError message={`Couldn't load dashboard. ${error}`} />}
          {data && !loading && (
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
          )}
        </>
      )}

      {activeTab === "Users" && <UsersTab />}
      {activeTab === "Doctor Verification" && <DoctorVerificationTab />}
      {activeTab === "Appointments & Payments" && <AppointmentsTab />}
    </div>
  );
}
