import { MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import type { PasswordFieldProps } from "../../types/props";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  togglePassword,
  disabled,
  borderClass,
  error,
}: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-1 flex-1 relative">
      <label
        className="text-[12px] leading-[16px] lg:text-[13px] lg:leading-[18px] tracking-[0.01em] font-semibold text-on-surface"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none text-lg" />
        <input
          className={`w-full h-9 lg:h-10 pr-10 p-3 bg-white/90 backdrop-blur-sm border rounded-xl text-[14px] lg:text-[15px] leading-[22px] font-normal text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 transition-all ${borderClass}`}
          id={id}
          name={id}
          placeholder="••••••••"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={togglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary-dark focus:outline-none cursor-pointer text-lg p-1 rounded transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-[11px] mt-0.5 leading-tight">{error}</p>
      )}
    </div>
  );
}
