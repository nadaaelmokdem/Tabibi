import React from "react";
import { FiEdit2 } from "react-icons/fi";

interface DetailReadViewProps {
  value: string | undefined;
  type?: string;
  label?: string;
  onEdit: () => void;
  onViewPhoto: () => void;
  disabled?: boolean;
}

const isImageUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.endsWith(".pdf") || trimmed.includes(".pdf?")) return false;
  return /\.(jpg|jpeg|png|webp|heic|heif|jfif)($|\?)/.test(trimmed) || trimmed.startsWith("data:image/") || (trimmed.includes("/uploads/proof-") && !trimmed.endsWith(".pdf"));
};

export const DetailReadView: React.FC<DetailReadViewProps> = ({
  value,
  type,
  label,
  onEdit,
  onViewPhoto,
  disabled,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className={`${type === "textarea" ? "" : "truncate"} w-full pr-2`}>
        {value ? (
          type === "tags" ? (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {value
                .split(",")
                .filter((t) => t.trim() !== "")
                .map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-surface-variant text-primary-dark px-2 py-0.5 rounded text-sm font-semibold"
                  >
                    {tag.trim()}
                  </span>
                ))}
            </div>
          ) : isImageUrl(value) ? (
            <div className="flex items-center gap-3">
              <img
                src={value}
                alt={label}
                className="w-12 h-12 object-cover rounded-md border border-surface-variant cursor-pointer hover:scale-105 hover:shadow-md transition-all"
                onClick={onViewPhoto}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <button
                type="button"
                onClick={onViewPhoto}
                className="text-sm font-semibold text-primary hover:underline text-left truncate max-w-[160px] sm:max-w-xs cursor-pointer"
              >
                View Photo
              </button>
            </div>
          ) : value?.includes("/uploads/proof-") || value?.includes("http") ? (
             <div className="flex items-center gap-3">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary hover:underline text-left truncate max-w-[160px] sm:max-w-xs cursor-pointer bg-surface-container px-3 py-1.5 rounded-md"
              >
                View Document
              </a>
            </div>
          ) : type === "textarea" ? (
            <p className="text-md font-medium text-primary-dark leading-relaxed whitespace-pre-wrap break-words">
              {value}
            </p>
          ) : type === "date" ? (
            <p className="text-lg font-bold text-primary-dark truncate leading-tight">
              {value.split("T")[0]}
            </p>
          ) : (
            <p className="text-lg font-bold text-primary-dark truncate leading-tight">
              {value}
            </p>
          )
        ) : (
          <p className="text-lg font-medium text-primary-light italic">
            No Data
          </p>
        )}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={onEdit}
          className="text-primary-light hover:text-primary cursor-pointer p-1.5 rounded-md hover:bg-surface-container transition-all flex-shrink-0"
          title={`Edit ${label}`}
        >
          <FiEdit2 size={16} />
        </button>
      )}
    </div>
  );
};
