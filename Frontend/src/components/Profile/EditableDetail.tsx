import { useEffect, useRef, useState } from "react";
import type { EditableDetailItemProps } from "../../types/profilePageProps";
import { FiCheck, FiEdit2, FiX } from "react-icons/fi";
import { AxiosError } from "axios";


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
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const validateInput = (val: string | undefined): boolean => {
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

  useEffect(() => {
    if (isEditing) {
      if (options && selectRef.current) {
        selectRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
    setLocalValue(value);
    setError(null);
  }, [isEditing, value, options]);

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
              <div className="w-full flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {localValue
                    ?.split(",")
                    .filter((t) => t.trim() !== "")
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 bg-[#F3F0FF] text-[#6A5ACD] px-2 py-1 rounded-md text-sm font-medium"
                      >
                        {tag.trim()}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = localValue
                              ?.split(",")
                              .map((t) => t.trim())
                              .filter((t) => t !== tag.trim());
                            setLocalValue(newTags?.join(", "));
                          }}
                          className="text-[#6A5ACD] hover:text-red-500"
                        >
                          <FiX size={14} />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        e.currentTarget.value.trim() !== ""
                      ) {
                        const newTag = e.currentTarget.value.trim();
                        const currentTags = localValue
                          ? localValue
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t) => t !== "")
                          : [];
                        if (!currentTags.includes(newTag)) {
                          currentTags.push(newTag);
                          setLocalValue(currentTags.join(", "));
                        }
                        e.currentTarget.value = "";
                      }
                    }}
                    className="w-full bg-[#FBFAFF] border border-[#6A5ACD] rounded px-2 py-1 text-sm font-medium text-[#2A2455] focus:outline-none"
                    placeholder="Type and press Enter to add"
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement;
                      if (input.value.trim() !== "") {
                        const newTag = input.value.trim();
                        const currentTags = localValue
                          ? localValue
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t) => t !== "")
                          : [];
                        if (!currentTags.includes(newTag)) {
                          currentTags.push(newTag);
                          setLocalValue(currentTags.join(", "));
                        }
                        input.value = "";
                      }
                    }}
                    className="p-1.5 bg-[#6A5ACD] text-white rounded hover:bg-[#2A2455] text-sm whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <input
                ref={inputRef}
                type={type}
                value={localValue}
                onChange={(e) => {
                  setLocalValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && validateInput(localValue)) {
                    handleSaveToBackend(localValue);
                  }
                }}
                className="w-full bg-[#FBFAFF] border border-[#6A5ACD] rounded px-2 py-1 text-lg font-semibold text-[#2A2455] focus:outline-none"
                placeholder={`Enter ${label?.toLowerCase()}`}
              />
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  handleSaveToBackend(localValue);
                }}
                disabled={isSaving}
                className="p-1.5 bg-[#6A5ACD] text-white rounded hover:bg-[#2A2455] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheck size={16} />
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="p-1.5 bg-[#E6E1FF] text-[#2A2455] rounded hover:bg-[#B8A7FF] disabled:opacity-50"
              >
                <FiX size={16} />
              </button>
            </div>
            {error && <p className="text-red-500 text-sm w-full">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="truncate w-full pr-2">
              {value ? (
                type === "tags" ? (
                  <div className="flex flex-wrap gap-2 pt-1 pb-1">
                    {value
                      .split(",")
                      .filter((t) => t.trim() !== "")
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-[#E6E1FF] text-[#5140b3] px-2 py-0.5 rounded text-sm font-semibold"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-lg font-bold text-[#2A2455] truncate leading-tight">
                    {value}
                  </p>
                )
              ) : (
                <p className="text-lg font-medium text-[#B8A7FF] italic">
                  No Data
                </p>
              )}
            </div>

            <button
              onClick={onEdit}
              className="text-[#B8A7FF] hover:text-[#6A5ACD] cursor-pointer p-1.5 rounded-md hover:bg-[#F3F0FF] transition-all flex-shrink-0"
              title={`Edit ${label}`}
            >
              <FiEdit2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
