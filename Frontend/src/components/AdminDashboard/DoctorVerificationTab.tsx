import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminService from "../../services/adminService";
import type { AdminDoctor, DoctorDecision } from "../../types/admin";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-600",
  Approved: "bg-green-50 text-green-600",
  Rejected: "bg-red-50 text-red-500",
  NeedsChanges: "bg-orange-50 text-orange-600",
};

export default function DoctorVerificationTab() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    AdminService.getAllDoctors()
      .then(setDoctors)
      .catch((err) => setError(err.message ?? "Failed to load doctors"))
      .finally(() => setLoading(false));
  }

  async function handleDecision(doctor: AdminDoctor, decision: DoctorDecision) {
    let comment: string | undefined;

    if (decision !== "Approved") {
      const { value, isConfirmed } = await Swal.fire({
        title: decision === "Rejected" ? "Reject application" : "Request changes",
        input: "textarea",
        inputLabel: "Comment for the doctor (required)",
        inputPlaceholder: "Explain what's wrong or what needs to change...",
        showCancelButton: true,
        confirmButtonColor: "#6A5ACD",
        confirmButtonText: decision === "Rejected" ? "Reject" : "Request changes",
        inputValidator: (v) => (!v ? "A comment is required" : undefined),
      });
      if (!isConfirmed) return;
      comment = value;
    } else {
      const { isConfirmed } = await Swal.fire({
        title: `Approve ${doctor.fullName}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#6A5ACD",
        confirmButtonText: "Approve",
      });
      if (!isConfirmed) return;
    }

    setActioningId(doctor.doctorId);
    try {
      await AdminService.reviewDoctor(doctor.doctorId, decision, comment);
      load();
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <p className="text-[#2A2455]/60 text-sm">Loading doctors...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
      {doctors.length === 0 ? (
        <p className="text-sm text-gray-400">No doctors registered yet.</p>
      ) : (
        <ul className="divide-y divide-[#F4F1FF]">
          {doctors.map((d) => (
            <li key={d.doctorId} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#2A2455]">{d.fullName}</p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[d.verificationStatus] ?? ""}`}
                  >
                    {d.verificationStatus}
                  </span>
                </div>
                <p className="text-sm text-[#2A2455]/60">
                  License {d.licenseNumber} · {d.clinicLocation} · {d.yearsOfExperience} yrs exp
                </p>
                {d.adminComment && (
                  <p className="text-xs text-[#2A2455]/50 mt-1 italic">"{d.adminComment}"</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  disabled={actioningId === d.doctorId}
                  onClick={() => handleDecision(d, "Approved")}
                  className="rounded-lg bg-[#6A5ACD] px-3 py-1 text-sm text-white hover:bg-[#5b4dc0] disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={actioningId === d.doctorId}
                  onClick={() => handleDecision(d, "NeedsChanges")}
                  className="rounded-lg bg-orange-50 px-3 py-1 text-sm text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                >
                  Request changes
                </button>
                <button
                  disabled={actioningId === d.doctorId}
                  onClick={() => handleDecision(d, "Rejected")}
                  className="rounded-lg bg-[#F4F1FF] px-3 py-1 text-sm text-[#2A2455] hover:bg-[#E6E1FF] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
