import { FaStethoscope } from "react-icons/fa6";
import type { BrandHeaderProps } from "../../types/props";

export default function BrandHeader({
  size = "large",
  title,
  subtitle,
  onNavigateHome,
}: BrandHeaderProps) {
  const isLarge = size === "large";
  const chipSize = isLarge ? "w-10 h-10 lg:w-12 lg:h-12" : "w-8 h-8 lg:w-9 lg:h-9";
  const iconSize = isLarge ? 18 : 15;

  return (
    <div
      className={`flex flex-col items-center lg:items-start text-center lg:text-left ${isLarge ? "gap-2" : "gap-0.5"}`}
    >
      <button
        type="button"
        className="flex items-center gap-2.5 text-primary-dark cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onNavigateHome}
      >
        <div className={`${chipSize} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary-light`}>
          <FaStethoscope size={iconSize} className="text-white" />
        </div>
        <span
          className={`font-extrabold tracking-tight text-primary-dark ${
            isLarge
              ? "text-[28px] leading-[36px] lg:text-[40px] lg:leading-[48px]"
              : "text-[24px] leading-[32px] lg:text-[32px] lg:leading-[40px]"
          }`}
        >
          Tabibi
        </span>
      </button>
      <div
        className={`flex flex-col ${isLarge ? "gap-1 mt-1 lg:mt-2" : "gap-0"}`}
      >
        <h1
          className={`font-extrabold text-on-surface tracking-tight ${
            isLarge
              ? "text-[24px] leading-[32px] lg:text-[28px] lg:leading-[36px]"
              : "text-[20px] leading-[28px] lg:text-[24px] lg:leading-[32px]"
          }`}
        >
          {title}
        </h1>
        <p
          className={`font-normal text-on-surface-variant ${
            isLarge
              ? "text-[14px] leading-[20px] lg:text-[16px] lg:leading-[24px]"
              : "text-[13px] leading-[18px] lg:text-[14px] lg:leading-[20px]"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
