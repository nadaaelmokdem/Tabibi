import { useEffect, useRef, useState } from "react";
import type { EditableDetailItemProps } from "../../types/profilePageProps";
import { FiCheck, FiX } from "react-icons/fi";
import { AxiosError } from "axios";
import { PhotoPreviewModal } from "./PhotoPreviewModal";
import { TagsInput } from "./TagsInput";
import { DetailReadView } from "./DetailReadView";

const isImageUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg)($|\?)/i.test(trimmed) || trimmed.startsWith("data:image/") || trimmed.includes("/uploads/proof-");
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
    <div className="bg-white p-2.5 rounded-lg border border-[#E6E1FF] flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-2 bg-[#FBFAFF] border border-[#E6E1FF] text-[#6A5ACD] rounded-md flex-shrink-0 text-md">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#B8A7FF] font-bold tracking-wider uppercase mb-0">
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
                className="w-full bg-[#FBFAFF] border border-[#6A5ACD] rounded px-2 py-1 text-lg font-semibold text-[#2A2455] focus:outline-none"
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
                className="flex-1 w-full bg-[#FBFAFF] border border-[#6A5ACD] rounded px-2 py-1 text-md font-medium text-[#2A2455] focus:outline-none min-h-[120px] resize-y"
                placeholder={`Enter ${label?.toLowerCase()}`}
              />
            ) : (
              <div className="flex w-full gap-2 relative flex-1 min-w-0">
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
                  className="flex-1 w-full bg-[#FBFAFF] border border-[#6A5ACD] rounded px-2 py-1 text-lg font-semibold text-[#2A2455] focus:outline-none min-w-0"
                  placeholder={`Enter ${label?.toLowerCase()}`}
                />
                {allowUpload && fieldName && (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isImageUrl(localValue) && (
                      <img
                        src={localValue}
                        alt="Preview"
                        className="w-8 h-8 object-cover rounded border border-[#E6E1FF] cursor-pointer"
                        onClick={() => setIsModalOpen(true)}
                        title="Click to preview"
                      />
                    )}
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSaving}
                      className="h-full px-3 py-1 bg-[#E6E1FF] text-[#6A5ACD] text-sm font-bold rounded border border-[#6A5ACD] hover:bg-[#B8A7FF] hover:text-white transition-colors cursor-pointer"
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
                className="p-1.5 bg-[#6A5ACD] text-white rounded hover:bg-[#2A2455] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiCheck size={16} />
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="p-1.5 bg-[#E6E1FF] text-[#2A2455] rounded hover:bg-[#B8A7FF] disabled:opacity-50 cursor-pointer"
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
