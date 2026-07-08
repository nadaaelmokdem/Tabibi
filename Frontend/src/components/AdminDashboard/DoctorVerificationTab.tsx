import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MdExpandMore, MdExpandLess, MdOpenInNew } from "react-icons/md";
import AdminService from "../../services/adminService";
import type {
  AdminDoctor,
  AdminDoctorDetail,
  DoctorDecision,
  DoctorProfileChangeLog,
} from "../../types/admin";
import Skeleton from "../common/Skeleton";
import NetworkError from "../common/NetworkError";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-600",
  Approved: "bg-green-50 text-green-600",
  Rejected: "bg-red-50 text-red-500",
  NeedsChanges: "bg-orange-50 text-orange-600",
};

const FIELD_LABELS: Record<string, string> = {
  LicenseNumber: "License Number",
  NationalIdNumber: "National ID",
  LicenseExpiryDate: "License Expiry",
  LicenseProofUrl: "License Proof",
  IdProofUrl: "ID Proof",
  DegreeProofUrl: "Degree Proof",
  Specialties: "Specialties",
};

function formatFieldValue(fieldName: string, value?: string) {
  if (!value) return "—";
  if (fieldName.endsWith("ProofUrl")) {
    return value.startsWith("http") || value.startsWith("/") ? value : value;
  }
  return value;
}

export default function DoctorVerificationTab() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, AdminDoctorDetail>>({});
  const [changes, setChanges] = useState<Record<number, DoctorProfileChangeLog[]>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

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

  async function toggleExpand(doctorId: number) {
    if (expandedId === doctorId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(doctorId);

    if (details[doctorId] && changes[doctorId]) return;

    setLoadingDetailId(doctorId);
    try {
      const [detail, changeLog] = await Promise.all([
        AdminService.getDoctorDetail(doctorId),
        AdminService.getDoctorChanges(doctorId),
      ]);
      setDetails((prev) => ({ ...prev, [doctorId]: detail }));
      setChanges((prev) => ({ ...prev, [doctorId]: changeLog }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : "Failed to load details",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setLoadingDetailId(null);
    }
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
        confirmButtonText: decision === "Rejected" ? "Reject" : "Request changes",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-gray-100',
          title: 'text-2xl font-bold mb-4 text-gray-800 text-left w-full',
          inputLabel: 'text-sm font-bold text-gray-700 mb-1.5 ml-1 text-left w-full block',
          input: 'w-full border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#6A5ACD]/20 focus:border-[#6A5ACD] p-3 border bg-gray-50 font-medium text-gray-700 outline-none transition-all resize-none min-h-[100px]',
          confirmButton: `w-full bg-[#6A5ACD] hover:bg-[#5b4dc0] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-2 cursor-pointer`,
          cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        },
        inputValidator: (v) => (!v ? "A comment is required" : undefined),
      });
      if (!isConfirmed) return;
      comment = value;
    } else {
      const { isConfirmed } = await Swal.fire({
        title: `Approve ${doctor.fullName}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Approve",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-xl font-bold mb-2 text-gray-800',
          confirmButton: 'w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
          cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        }
      });
      if (!isConfirmed) return;
    }

    setActioningId(doctor.doctorId);
    try {
      await AdminService.reviewDoctor(doctor.doctorId, decision, comment);
      setDetails((prev) => {
        const next = { ...prev };
        delete next[doctor.doctorId];
        return next;
      });
      setChanges((prev) => {
        const next = { ...prev };
        delete next[doctor.doctorId];
        return next;
      });
      if (expandedId === doctor.doctorId) setExpandedId(null);
      load();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : "Action failed",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setActioningId(null);
    }
  }

  async function handleAdvancedAction(doctor: AdminDoctor, action: "revert" | "ban") {
    let comment: string | undefined;

    if (action === "ban") {
      const { value, isConfirmed } = await Swal.fire({
        title: "Ban Doctor",
        input: "textarea",
        inputLabel: "Reason for ban (required)",
        inputPlaceholder: "Explain why this doctor is being banned...",
        showCancelButton: true,
        confirmButtonText: "Ban Doctor",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-gray-100',
          title: 'text-2xl font-bold mb-4 text-gray-800 text-left w-full',
          inputLabel: 'text-sm font-bold text-gray-700 mb-1.5 ml-1 text-left w-full block',
          input: 'w-full border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 p-3 border bg-gray-50 font-medium text-gray-700 outline-none transition-all resize-none min-h-[100px]',
          confirmButton: `w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-2 cursor-pointer`,
          cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        },
        inputValidator: (v) => (!v ? "A reason is required" : undefined),
      });
      if (!isConfirmed) return;
      comment = value;
    } else {
      const { isConfirmed } = await Swal.fire({
        title: `Revert changes for ${doctor.fullName}?`,
        text: "This will restore their last approved data and re-approve their profile.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Revert & Approve",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
          cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        }
      });
      if (!isConfirmed) return;
    }

    setActioningId(doctor.doctorId);
    try {
      await AdminService.reviewDoctor(
        doctor.doctorId,
        action === "ban" ? "Rejected" : "Approved",
        comment,
        action === "revert",
        action === "ban"
      );
      setDetails((prev) => {
        const next = { ...prev };
        delete next[doctor.doctorId];
        return next;
      });
      setChanges((prev) => {
        const next = { ...prev };
        delete next[doctor.doctorId];
        return next;
      });
      if (expandedId === doctor.doctorId) setExpandedId(null);
      load();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : "Action failed",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <NetworkError message={error} />;

  const sortedDoctors = [...doctors].sort((a, b) => {
    if (a.verificationStatus === "Pending" && b.verificationStatus !== "Pending") return -1;
    if (b.verificationStatus === "Pending" && a.verificationStatus !== "Pending") return 1;
    return (b.pendingChangesCount ?? 0) - (a.pendingChangesCount ?? 0);
  });

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl p-5">
      {sortedDoctors.length === 0 ? (
        <p className="text-sm text-gray-400">No doctors registered yet.</p>
      ) : (
        <ul className="divide-y divide-[#F4F1FF]">
          {sortedDoctors.map((d) => {
            const isExpanded = expandedId === d.doctorId;
            const detail = details[d.doctorId];
            const doctorChanges = changes[d.doctorId] ?? [];

            return (
              <li key={d.doctorId} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#2A2455]">{d.fullName}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[d.verificationStatus] ?? ""}`}
                      >
                        {d.verificationStatus}
                      </span>
                      {(d.pendingChangesCount ?? 0) > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                          {d.pendingChangesCount} change{d.pendingChangesCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#2A2455]/60 mt-1">
                      License {d.licenseNumber || "—"} · {d.clinicLocation || "—"} · {d.yearsOfExperience} yrs exp
                    </p>
                    {d.adminComment && (
                      <p className="text-xs text-[#2A2455]/50 mt-1 italic">&ldquo;{d.adminComment}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 items-center">
                    <button
                      onClick={() => toggleExpand(d.doctorId)}
                      className="rounded-lg border border-[#E6E1FF] px-3 py-1 text-sm text-[#2A2455] hover:bg-[#F8F7FF] flex items-center gap-1"
                    >
                      Review
                      {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-xl border border-[#E6E1FF] bg-[#F8F7FF]/60 p-4 space-y-4">
                    {loadingDetailId === d.doctorId ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <>
                        {doctorChanges.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-[#2A2455] mb-2">Recent sensitive changes</h4>
                            <ul className="space-y-2">
                              {doctorChanges.map((c) => (
                                <li
                                  key={c.changeLogId}
                                  className="text-sm bg-white rounded-lg border border-[#E6E1FF] px-3 py-2"
                                >
                                  <div className="flex justify-between gap-2">
                                    <span className="font-medium text-[#2A2455]">
                                      {FIELD_LABELS[c.fieldName] ?? c.fieldName}
                                    </span>
                                    <span className="text-xs text-[#2A2455]/50 shrink-0">
                                      {new Date(c.changedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#2A2455]/70 mt-1">
                                    <span className="line-through opacity-60">{formatFieldValue(c.fieldName, c.oldValue)}</span>
                                    {" → "}
                                    <span className="font-medium">{formatFieldValue(c.fieldName, c.newValue)}</span>
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {detail && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-[#2A2455]/50">National ID</span>
                              <p className="font-medium text-[#2A2455]">{detail.nationalIdNumber || "—"}</p>
                            </div>
                            <div>
                              <span className="text-[#2A2455]/50">License expiry</span>
                              <p className="font-medium text-[#2A2455]">
                                {detail.licenseExpiryDate
                                  ? new Date(detail.licenseExpiryDate).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-[#2A2455]/50">Specialties</span>
                              <p className="font-medium text-[#2A2455]">
                                {detail.specialties.map((s) => s.name).join(", ") || "—"}
                              </p>
                            </div>
                            {detail.bio && (
                              <div className="md:col-span-2">
                                <span className="text-[#2A2455]/50">Bio</span>
                                <p className="font-medium text-[#2A2455]">{detail.bio}</p>
                              </div>
                            )}
                            <div className="md:col-span-2 flex flex-wrap gap-2">
                              {detail.licenseProofUrl && (
                                <ProofLink label="License Proof" url={detail.licenseProofUrl} />
                              )}
                              {detail.idProofUrl && (
                                <ProofLink label="ID Proof" url={detail.idProofUrl} />
                              )}
                              {detail.degreeProofUrl && (
                                <ProofLink label="Degree Proof" url={detail.degreeProofUrl} />
                              )}
                            </div>
                          </div>
                        )}

                        {detail?.oldLicenseNumber && (
                          <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-800 mb-3">Previous Approved Data (Backup)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div><span className="text-orange-600/70 block mb-1">National ID</span><p className="font-medium text-orange-900">{detail.oldNationalIdNumber || "—"}</p></div>
                              <div><span className="text-orange-600/70 block mb-1">License Number</span><p className="font-medium text-orange-900">{detail.oldLicenseNumber || "—"}</p></div>
                              <div><span className="text-orange-600/70 block mb-1">License expiry</span><p className="font-medium text-orange-900">{detail.oldLicenseExpiryDate ? new Date(detail.oldLicenseExpiryDate).toLocaleDateString() : "—"}</p></div>
                              <div className="md:col-span-2"><span className="text-orange-600/70 block mb-1">Specialties</span><p className="font-medium text-orange-900">{detail.oldSpecialties?.map((s) => s.name).join(", ") || "—"}</p></div>
                              <div className="md:col-span-2 flex flex-wrap gap-2 mt-2">
                                {detail.oldLicenseProofUrl && <ProofLink label="Old License Proof" url={detail.oldLicenseProofUrl} />}
                                {detail.oldIdProofUrl && <ProofLink label="Old ID Proof" url={detail.oldIdProofUrl} />}
                                {detail.oldDegreeProofUrl && <ProofLink label="Old Degree Proof" url={detail.oldDegreeProofUrl} />}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6E1FF]">
                          <button
                            disabled={actioningId === d.doctorId}
                            onClick={() => handleDecision(d, "Approved")}
                            className="rounded-lg bg-[#6A5ACD] px-3 py-1.5 text-sm text-white hover:bg-[#5b4dc0] disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId === d.doctorId}
                            onClick={() => handleDecision(d, "NeedsChanges")}
                            className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                          >
                            Request changes
                          </button>
                          <button
                            disabled={actioningId === d.doctorId}
                            onClick={() => handleDecision(d, "Rejected")}
                            className="rounded-lg bg-[#F4F1FF] px-3 py-1.5 text-sm text-[#2A2455] hover:bg-[#E6E1FF] disabled:opacity-50"
                          >
                            Reject
                          </button>
                          
                          {detail?.oldLicenseNumber && (
                            <button
                              disabled={actioningId === d.doctorId}
                              onClick={() => handleAdvancedAction(d, "revert")}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 disabled:opacity-50 ml-auto border border-blue-200"
                            >
                              Revert to Old Data
                            </button>
                          )}
                          <button
                            disabled={actioningId === d.doctorId}
                            onClick={() => handleAdvancedAction(d, "ban")}
                            className={`rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50 border border-red-200 ${!detail?.oldLicenseNumber ? "ml-auto" : ""}`}
                          >
                            Ban Doctor
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProofLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#E6E1FF] text-sm font-medium text-[#6A5ACD] hover:bg-[#F4F1FF]"
    >
      {label}
      <MdOpenInNew size={14} />
    </a>
  );
}
