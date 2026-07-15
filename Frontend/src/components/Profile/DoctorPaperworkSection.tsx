import React from "react";
import type { DoctorProfileSectionProps } from "../../types/profile";

interface Props extends Pick<DoctorProfileSectionProps, "errors" | "isLoading"> {
  licenseProofFile: File | null;
  licenseProofUrl: string;
  setLicenseProofFile: (file: File | null) => void;
  setLicenseProofUrl: (url: string) => void;
  licenseProofInputRef: React.RefObject<HTMLInputElement>;
  idProofFile: File | null;
  idProofUrl: string;
  setIdProofFile: (file: File | null) => void;
  setIdProofUrl: (url: string) => void;
  idProofInputRef: React.RefObject<HTMLInputElement>;
  degreeProofFile: File | null;
  degreeProofUrl: string;
  setDegreeProofFile: (file: File | null) => void;
  setDegreeProofUrl: (url: string) => void;
  degreeProofInputRef: React.RefObject<HTMLInputElement>;
  handleProofChange: (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void, errorKey: string) => void;
  renderProofPreview: (file: File | null, url: string, setFile: (file: File | null) => void, setUrl: (url: string) => void, inputRef?: React.RefObject<HTMLInputElement>) => React.ReactNode;
}

export default function DoctorPaperworkSection({
  errors,
  isLoading,
  licenseProofFile,
  licenseProofUrl,
  setLicenseProofFile,
  setLicenseProofUrl,
  licenseProofInputRef,
  idProofFile,
  idProofUrl,
  setIdProofFile,
  setIdProofUrl,
  idProofInputRef,
  degreeProofFile,
  degreeProofUrl,
  setDegreeProofFile,
  setDegreeProofUrl,
  degreeProofInputRef,
  handleProofChange,
  renderProofPreview,
}: Props) {
  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-surface-variant space-y-5">
      <div className="border-b border-surface-variant pb-3">
        <h2 className="text-lg font-bold text-on-surface">Paperwork & Verifications</h2>
        <p className="text-sm text-outline">Required documents for your verification process.</p>
      </div>
      
      <div className="space-y-4">
        {/* License Proof Document */}
        <div className="p-4 bg-surface-container rounded-xl border border-surface-variant">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div className="flex flex-col">
              <label className="text-[13px] lg:text-[14px] font-semibold text-on-surface">
                License Document Verification Proof
              </label>
              <span className="text-[11px] text-outline">Required: Upload PDF or image</span>
            </div>
          </div>
          {renderProofPreview(licenseProofFile, licenseProofUrl, setLicenseProofFile, setLicenseProofUrl, licenseProofInputRef)}
          <input
            ref={licenseProofInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleProofChange(e, setLicenseProofFile, "licenseProof")}
            className="w-full text-[13px] text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-surface-container file:text-primary-dark hover:file:bg-surface-variant transition-colors"
            disabled={isLoading}
          />
          {errors.licenseProof && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.licenseProof}</p>
          )}
        </div>

        {/* ID Proof Document */}
        <div className="p-4 bg-surface-container rounded-xl border border-surface-variant">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div className="flex flex-col">
              <label className="text-[13px] lg:text-[14px] font-semibold text-on-surface">
                ID Verification Proof
              </label>
              <span className="text-[11px] text-outline">Required: Accepted formats: PDF or image</span>
            </div>
          </div>
          {renderProofPreview(idProofFile, idProofUrl, setIdProofFile, setIdProofUrl, idProofInputRef)}
          <input
            ref={idProofInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleProofChange(e, setIdProofFile, "idProof")}
            className="w-full text-[13px] text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-surface-container file:text-primary-dark hover:file:bg-surface-variant transition-colors"
            disabled={isLoading}
          />
          {errors.idProof && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.idProof}</p>
          )}
        </div>

        {/* Degree Proof Document */}
        <div className="p-4 bg-surface-container rounded-xl border border-surface-variant">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div className="flex flex-col">
              <label className="text-[13px] lg:text-[14px] font-semibold text-on-surface">
                Degree Verification Proof
              </label>
              <span className="text-[11px] text-outline">Required: Accepted formats: PDF or image</span>
            </div>
          </div>
          {renderProofPreview(degreeProofFile, degreeProofUrl, setDegreeProofFile, setDegreeProofUrl, degreeProofInputRef)}
          <input
            ref={degreeProofInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleProofChange(e, setDegreeProofFile, "degreeProof")}
            className="w-full text-[13px] text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-surface-container file:text-primary-dark hover:file:bg-surface-variant transition-colors"
            disabled={isLoading}
          />
          {errors.degreeProof && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.degreeProof}</p>
          )}
        </div>
      </div>
    </section>
  );
}
