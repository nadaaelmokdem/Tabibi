import type { FormFieldProps } from "../../types/props";

export default function FormField({
  id,
  label,
  icon,
  placeholder,
  type,
  value,
  onChange,
  disabled,
  borderClass,
  error,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1 w-full relative">
      <label
        className="text-[12px] leading-[16px] lg:text-[13px] lg:leading-[18px] tracking-[0.01em] font-semibold text-on-surface"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        {icon}
        <input
          className={`w-full h-9 lg:h-10 p-3 bg-white/90 backdrop-blur-sm border rounded-xl text-[14px] lg:text-[15px] leading-[22px] font-normal text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 transition-all ${borderClass}`}
          id={id}
          name={id}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      {error && <p className="text-red-500 text-[11px] mt-0.5">{error}</p>}
    </div>
  );
}
