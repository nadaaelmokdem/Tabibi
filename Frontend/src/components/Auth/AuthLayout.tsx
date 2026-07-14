import { useNavigate } from "react-router-dom";
import { FaStethoscope } from "react-icons/fa6";

import type { AuthLayoutProps } from "../../types/props";

/**
 * Shared split-screen layout for all authentication pages.
 * Renders a full-screen background image with gradient overlays
 * on the left, and a card with the form content on the right.
 */
export default function AuthLayout({
  background,
  headerText,
  pText,
  children,
  cardMaxWidth = "max-w-xl",
}: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-surface-bright text-on-surface text-[16px] leading-[24px] font-normal antialiased h-screen overflow-hidden flex flex-col selection:bg-primary selection:text-surface-container">
      <main className="flex-grow flex w-full h-full relative">
        {/* Brand Header (visible on md+ screens) */}
        <header className="absolute top-4 left-15 z-50 flex items-center md:block hidden">
          <button
            onClick={() => navigate("/")}
            className="cursor-pointer flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-200"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-light shadow-floating">
              <FaStethoscope size={15} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">Tabibi</span>
          </button>
        </header>

        {/* Full-Screen Background Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img
            alt="Tabibi Medical Group"
            className="w-full h-full object-cover object-left"
            src={background}
          />
        </div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-0" />
          <div className="absolute inset-y-0 right-0 w-[60%] bg-gradient-to-t to-transparent backdrop-blur-sm hidden lg:block" />
        </div>

        {/* Content */}
        <div className="relative w-full h-full flex flex-col lg:flex-row z-20 max-lg:backdrop-blur-sm">
          {/* Left Side: Hero Text */}
          <div className="hidden lg:flex flex-col justify-end w-[40%] p-8 lg:p-12 pb-16 lg:pb-24">
            <div className="max-w-md">
              <h2 className="text-[32px] lg:text-[40px] leading-[40px] lg:leading-[48px] tracking-[-0.01em] font-bold mb-4 text-white drop-shadow-md">
                {headerText}
              </h2>
              <p className="text-[16px] lg:text-[18px] leading-[24px] lg:leading-[28px] font-normal text-white/90 drop-shadow-sm">
                {pText}
              </p>
            </div>
          </div>

          {/* Right Side: Form Card */}
          <div className="w-full lg:w-[60%] h-full flex items-center justify-center p-4 lg:p-6 lg:p-8 ml-auto">
            <div
              className={`overflow-y-auto min-h-0 max-h-[98vh] w-full ${cardMaxWidth} flex flex-col gap-3 lg:gap-4 bg-white/95 backdrop-blur-md p-4 lg:p-6 rounded-3xl shadow-floating border border-white/20`}
            >
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
