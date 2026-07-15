import { useEffect, useRef, useState } from "react";
import type { EditableDetailItemProps } from "../../types/profilePageProps";
import { FiCheck, FiX } from "react-icons/fi";
import { MdAssignment } from "react-icons/md";
import { CachedImage } from "../common/CachedImage";
import { getFileUrl } from "../../utils/fileUtils";
import { AxiosError } from "axios";
import { PhotoPreviewModal } from "./PhotoPreviewModal";
import { TagsInput } from "./TagsInput";
import { DetailReadView } from "./DetailReadView";


const isPdfUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.endsWith(".pdf") || trimmed.includes(".pdf?");
};

const isImageUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.endsWith(".pdf") || trimmed.includes(".pdf?")) return false;
  return /\.(jpg|jpeg|png|webp|heic|heif|jfif)($|\?)/.test(trimmed) || trimmed.startsWith("data:image/") || (trimmed.includes("/uploads/proof-") && !trimmed.endsWith(".pdf"));
};

export const EditableDetailItem: React.FC<EditableDetailItemProps> = ({
  icon,
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  type = "text",
  options,
  tagOptions,
  fieldName,
  allowUpload,
  disabled,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const validateInput = (val: string | undefined): boolean => {
    if (fieldName === "licenseNumber") {
      if (!val || !val.trim()) {
        setError("License number is required.");
        return false;
      }
      if (!/^\d+$/.test(val.trim())) {
        setError("Must contain digits only (Egyptian Medical Syndicate number).");
        return false;
      }
    }
    if (fieldName === "nationalIdNumber") {
      if (!val || !val.trim()) {
        setError("National ID is required.");
        return false;
      }
      if (!/^(2|3)\d{13}$/.test(val.trim())) {
        setError("Must be a valid 14-digit Egyptian National ID.");
        return false;
      }
    }
    if (fieldName === "licenseProofUrl" || fieldName === "idProofUrl" || fieldName === "degreeProofUrl") {
      if (val && val.trim() !== "") {
        const trimmed = val.trim();
        if (!trimmed.startsWith("/")) {
          try {
            const url = new URL(trimmed);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
              setError("Please enter a valid HTTP/HTTPS link.");
              return false;
            }
          } catch {
            setError("Please enter a valid URL link.");
            return false;
          }
        }
      }
    }
    if (type === "number" && val?.trim() !== "") {
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        setError("Please enter a valid positive number");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSaveToBackend = async (val: string | undefined) => {
    if (!validateInput(val)) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.resolve(onSave(val));
    } catch (err: unknown) {
      let errorMsg = "Failed to save changes";
      if (err instanceof AxiosError && err.response?.data) {
        const errorData = err.response.data;
        if (Array.isArray(errorData) && errorData.length > 0) {
          errorMsg = errorData[0].description || errorMsg;
        } else if (typeof errorData === "string") {
          errorMsg = errorData;
        } else if (errorData.message) {
          errorMsg = errorData.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fieldName) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only images and PDFs are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const { default: DoctorService } = await import("../../services/doctorService");
      const url = await DoctorService.uploadProof(file, fieldName);
      setLocalValue(url);
      await handleSaveToBackend(url);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (isEditing) {
      if (options && selectRef.current) {
        selectRef.current.focus();
      } else if (type === "textarea" && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
    setLocalValue(type === "date" && value ? value.split("T")[0] : value);
    setError(null);
  }, [isEditing, value, options, type]);

  return (
    <div className="bg-white p-2.5 rounded-lg border border-surface-variant flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-2 bg-background border border-surface-variant text-primary rounded-md flex-shrink-0 text-md">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-primary-light font-bold tracking-wider uppercase mb-0">
          {label}
        </p>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-0.5 flex-col sm:flex-row">
            {options ? (
              <select
                ref={selectRef}
                value={localValue}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  setError(null);
                }}
                className="w-full bg-background border border-primary rounded px-2 py-1 text-lg font-semibold text-primary-dark focus:outline-none"
              >
                <option value="">Select {label}</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : type === "tags" ? (
              <TagsInput
                value={localValue || ""}
                onChange={(val) => {
                  setLocalValue(val);
                  setError(null);
                }}
                tagOptions={tagOptions}
              />
            ) : type === "textarea" ? (
              <textarea
                ref={textareaRef}
                value={localValue || ""}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  setError(null);
                }}
                className="flex-1 w-full bg-background border border-primary rounded px-2 py-1 text-md font-medium text-primary-dark focus:outline-none min-h-[120px] resize-y"
                placeholder={`Enter ${label?.toLowerCase()}`}
              />
            ) : (
              <div className="flex w-full gap-2 relative flex-1 min-w-0">
                {allowUpload ? (
                  <div className="flex-1 w-full bg-background border border-primary rounded px-2 py-1 text-sm font-semibold text-primary-dark flex items-center min-w-0 opacity-80 cursor-not-allowed">
                    <span className="truncate">
                      {localValue ? "File uploaded" : "No file selected"}
                    </span>
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    type={type}
                    value={localValue || ""}
                    onChange={(e) => {
                      setLocalValue(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && validateInput(localValue)) {
                        handleSaveToBackend(localValue);
                      }
                    }}
                    className="flex-1 w-full bg-background border border-primary rounded px-2 py-1 text-lg font-semibold text-primary-dark focus:outline-none min-w-0"
                    placeholder={`Enter ${label?.toLowerCase()}`}
                  />
                )}
                {allowUpload && fieldName && (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isImageUrl(localValue) && (
                      <CachedImage
                        src={localValue!}
                        alt="Preview"
                        className="w-8 h-8 object-cover rounded border border-surface-variant cursor-pointer"
                        onClick={() => setIsModalOpen(true)}
                        title="Click to preview"
                      />
                    )}
                    {isPdfUrl(localValue) && (
                      <a href={getFileUrl(localValue!)} target="_blank" rel="noreferrer" title="View PDF">
                        <div className="w-8 h-8 flex items-center justify-center bg-surface-container rounded border border-surface-variant text-primary-dark cursor-pointer hover:bg-surface-variant">
                          <MdAssignment size={18} />
                        </div>
                      </a>
                    )}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSaving}
                      className="h-full px-3 py-1 bg-surface-variant text-primary text-sm font-bold rounded border border-primary hover:bg-primary-light hover:text-white transition-colors cursor-pointer"
                      title="Upload File"
                    >
                      {isUploading ? "..." : "Upload"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  handleSaveToBackend(localValue);
                }}
                disabled={isSaving}
                className="p-1.5 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiCheck size={16} />
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="p-1.5 bg-surface-variant text-primary-dark rounded hover:bg-primary-light disabled:opacity-50 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
            {error && <p className="text-red-500 text-sm w-full">{error}</p>}
          </div>
        ) : (
          <DetailReadView
            value={value}
            type={type}
            label={label}
            onEdit={onEdit}
            onViewPhoto={() => setIsModalOpen(true)}
            disabled={disabled}
          />
        )}
      </div>

      <PhotoPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        label={label || ""}
        imageUrl={isEditing ? localValue || "" : value || ""}
      />
    </div>
  );
};
