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
import { getFileUrl } from "../../utils/fileUtils";

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
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setLoadingDetailId(null);
    }
  }

  function validateDoctorData(detail: AdminDoctorDetail): string[] {
    const missingFields: string[] = [];

    if (!detail.nationalIdNumber) missingFields.push("National ID Number");
    if (!detail.licenseNumber) missingFields.push("License Number");
    if (!detail.licenseExpiryDate) missingFields.push("License Expiry Date");
    if (detail.yearsOfExperience == null) missingFields.push("Years of Experience");
    if (!detail.licenseProofUrl) missingFields.push("License Proof Document");
    if (!detail.idProofUrl) missingFields.push("ID Proof Document");
    if (!detail.degreeProofUrl) missingFields.push("Degree Proof Document");
    if (!detail.specialties || detail.specialties.length === 0) missingFields.push("Specialties");

    return missingFields;
  }

  async function handleDecision(doctor: AdminDoctor, decision: DoctorDecision) {
    let comment: string | undefined;

    if (decision === "Approved") {
      const detail = details[doctor.doctorId];
      if (detail) {
        const missingFields = validateDoctorData(detail);
        if (missingFields.length > 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Cannot Approve Doctor',
            text: `Missing required fields: ${missingFields.join(", ")}`,
            buttonsStyling: false,
            customClass: {
              popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-surface-variant',
              title: 'text-2xl font-bold mb-2 text-primary-dark',
              htmlContainer: 'text-on-surface-variant mb-6 m-0',
              confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
            }
          });
          return;
        }
      }

      const { isConfirmed } = await Swal.fire({
        title: `Approve ${doctor.fullName}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Approve",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-surface-variant',
          title: 'text-xl font-bold mb-2 text-primary-dark',
          confirmButton: 'w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
          cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        }
      });
      if (!isConfirmed) return;
    } else {
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
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-4 text-primary-dark text-left w-full',
          inputLabel: 'text-sm font-bold text-on-surface mb-1.5 ml-1 text-left w-full block',
          input: 'w-full border-surface-variant rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary p-3 border bg-surface-container font-medium text-on-surface outline-none transition-all resize-none min-h-[100px]',
          confirmButton: `w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-2 cursor-pointer`,
          cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        },
        inputValidator: (v) => (!v ? "A comment is required" : undefined),
      });
      if (!isConfirmed) return;
      comment = value;
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
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setActioningId(null);
    }
  }

  async function handleAdvancedAction(doctor: AdminDoctor, action: "revert" | "ban") {
    let comment: string | undefined;

    if (action === "revert") {
      const detail = details[doctor.doctorId];
      if (detail) {
        const missingFields = validateDoctorData(detail);
        if (missingFields.length > 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Cannot Revert & Approve',
            text: `Missing required fields in current data: ${missingFields.join(", ")}`,
            buttonsStyling: false,
            customClass: {
              popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-surface-variant',
              title: 'text-2xl font-bold mb-2 text-primary-dark',
              htmlContainer: 'text-on-surface-variant mb-6 m-0',
              confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
            }
          });
          return;
        }
      }

      const { isConfirmed } = await Swal.fire({
        title: `Revert changes for ${doctor.fullName}?`,
        text: "This will restore their last approved data and re-approve their profile.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Revert & Approve",
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-surface-variant',
          title: 'text-xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
          confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
          cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        }
      });
      if (!isConfirmed) return;
    } else {
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
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-4 text-primary-dark text-left w-full',
          inputLabel: 'text-sm font-bold text-on-surface mb-1.5 ml-1 text-left w-full block',
          input: 'w-full border-surface-variant rounded-xl shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 p-3 border bg-surface-container font-medium text-on-surface outline-none transition-all resize-none min-h-[100px]',
          confirmButton: `w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm mt-2 cursor-pointer`,
          cancelButton: 'w-full mt-3 py-3 text-text-muted font-semibold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-colors cursor-pointer',
          actions: 'flex flex-col w-full m-0'
        },
        inputValidator: (v) => (!v ? "A reason is required" : undefined),
      });
      if (!isConfirmed) return;
      comment = value;
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
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-surface-variant',
          title: 'text-2xl font-bold mb-2 text-primary-dark',
          htmlContainer: 'text-on-surface-variant mb-6 m-0',
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
    <div className="bg-white border border-surface-variant rounded-2xl p-5">
      {sortedDoctors.length === 0 ? (
        <p className="text-sm text-outline-variant">No doctors registered yet.</p>
      ) : (
        <ul className="divide-y divide-surface-container">
          {sortedDoctors.map((d) => {
            const isExpanded = expandedId === d.doctorId;
            const detail = details[d.doctorId];
            const doctorChanges = changes[d.doctorId] ?? [];

            return (
              <li key={d.doctorId} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary-dark">{d.fullName}</p>
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
                    <p className="text-sm text-primary-dark/60 mt-1">
                      License {d.licenseNumber || "—"} · {d.clinicLocation || "—"} · {d.yearsOfExperience} yrs exp
                    </p>
                    {d.adminComment && (
                      <p className="text-xs text-primary-dark/50 mt-1 italic">&ldquo;{d.adminComment}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 items-center">
                    <button
                      onClick={() => toggleExpand(d.doctorId)}
                      className="rounded-lg border border-surface-variant px-3 py-1 text-sm text-primary-dark hover:bg-surface-container flex items-center gap-1"
                    >
                      Review
                      {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-xl border border-surface-variant bg-surface-container/60 p-4 space-y-4">
                    {loadingDetailId === d.doctorId ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <>
                        {doctorChanges.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary-dark mb-2">Recent sensitive changes</h4>
                            <ul className="space-y-2">
                              {doctorChanges.map((c) => (
                                <li
                                  key={c.changeLogId}
                                  className="text-sm bg-white rounded-lg border border-surface-variant px-3 py-2"
                                >
                                  <div className="flex justify-between gap-2">
                                    <span className="font-medium text-primary-dark">
                                      {FIELD_LABELS[c.fieldName] ?? c.fieldName}
                                    </span>
                                    <span className="text-xs text-primary-dark/50 shrink-0">
                                      {new Date(c.changedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-primary-dark/70 mt-1">
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
                              <span className="text-primary-dark/50">National ID</span>
                              <p className="font-medium text-primary-dark">{detail.nationalIdNumber || "—"}</p>
                            </div>
                            <div>
                              <span className="text-primary-dark/50">License expiry</span>
                              <p className="font-medium text-primary-dark">
                                {detail.licenseExpiryDate
                                  ? new Date(detail.licenseExpiryDate).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-primary-dark/50">Specialties</span>
                              <p className="font-medium text-primary-dark">
                                {detail.specialties.map((s) => s.name).join(", ") || "—"}
                              </p>
                            </div>
                            {detail.bio && (
                              <div className="md:col-span-2">
                                <span className="text-primary-dark/50">Bio</span>
                                <p className="font-medium text-primary-dark">{detail.bio}</p>
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

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-variant">
                          <button
                            disabled={actioningId === d.doctorId}
                            onClick={() => handleDecision(d, "Approved")}
                            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
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
                            className="rounded-lg bg-surface-container px-3 py-1.5 text-sm text-primary-dark hover:bg-surface-variant disabled:opacity-50"
                          >
                            Reject
                          </button>
                          
                          {detail?.oldLicenseNumber && (
                            <button
                              disabled={actioningId === d.doctorId}
                              onClick={() => handleAdvancedAction(d, "revert")}
                              className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/15 disabled:opacity-50 ml-auto border border-primary/20"
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullUrl = getFileUrl(url);
  
  return (
    <>
      <button
        onClick={() => setIsFullScreen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-surface-variant text-sm font-medium text-primary hover:bg-surface-container cursor-pointer"
      >
        {label}
        <MdOpenInNew size={14} />
      </button>
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullScreen(false);
          }}
        >
          <img 
            src={fullUrl} 
            alt={label} 
            className="max-w-full max-h-full object-contain cursor-default rounded-md shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(false);
            }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}
    </>
  );
}
