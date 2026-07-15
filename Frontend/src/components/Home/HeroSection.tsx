import { useNavigate } from "react-router-dom";
import {
  FaStethoscope,
  FaVideo,
  FaPhone,
  FaCommentDots,
  FaArrowRight,

} from "react-icons/fa6";
import { FaClinicMedical } from "react-icons/fa";
import { MdAutoAwesome } from "react-icons/md";

type ConsultMode = {
  icon: typeof MdAutoAwesome;
  label: string;
  desc: string;
  color: string;
  bg: string;
};

const CONSULT_MODES: ConsultMode[] = [
  { icon: MdAutoAwesome, label: "AI Assistant", desc: "Instant AI-powered triage", color: "#6A5ACD", bg: "#EDE9FF" },
  { icon: FaClinicMedical, label: "Clinic Visit", desc: "Book in-person appointments", color: "#0a8a60", bg: "#e0f7ef" },
  { icon: FaPhone, label: "Voice Call", desc: "Speak directly with a doctor", color: "#b05c10", bg: "#fdf0e3" },
  { icon: FaVideo, label: "Video Consult", desc: "Face-to-face from home", color: "#0369a1", bg: "#e0f2fe" },
  { icon: FaCommentDots, label: "Chat", desc: "Async messaging with your doctor", color: "#9b2cb0", bg: "#fce8ff" },
];

/**
 * Hero section of the home page.
 */
export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-6 pb-10 lg:pt-8 lg:pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 95% 0%, rgba(184,167,255,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 0% 100%, rgba(230,225,255,0.35) 0%, transparent 50%)
          `,
        }}
      />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        {/* Left: copy */}
        <div className="flex flex-col gap-5">


          <div className="text-center lg:text-left">
            <h1 className="font-heading font-extrabold text-primary-dark leading-[1.1] tracking-tight text-4xl sm:text-5xl lg:text-6xl mb-3">
              Your doctor is{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-light">
                one message away.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
              Always available and secure. Up to 15 AI health messages are provided daily, alongside 2 private, direct messages with a licensed General Practitioner each month.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-10">
            <button
              type="button"
              onClick={() => navigate("/ai-chat")}
              className="cursor-pointer flex items-center gap-2 text-base font-semibold px-6 py-3.5 rounded-xl bg-primary text-white shadow-floating hover:bg-primary-dark transition-all duration-300 hover:-translate-y-1 group"
            >
              <MdAutoAwesome size={16} className="transition-transform group-hover:scale-110" />
              Chat with AI
              <FaArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/doctors")}
              className="cursor-pointer flex items-center gap-2 text-base font-medium px-6 py-3.5 rounded-xl bg-surface-variant/40 text-primary-dark border border-primary/15 hover:bg-surface-variant/70 transition-all duration-300 hover:-translate-y-1"
            >
              <FaStethoscope size={15} />
              Browse Doctors
            </button>
          </div>

          {/* Consult modes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5 text-primary-light text-center lg:text-left">
              Every way to see a doctor
            </p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {CONSULT_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <span
                    key={mode.label}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 bg-white border"
                    style={{
                      borderColor: "rgba(106,90,205,0.1)",
                      boxShadow:  "0 1px 4px rgba(106,90,205,0.06)",
                      background: "#ffffff",
                      transform:  "none",
                    }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: mode.bg }}>
                      <Icon size={12} style={{ color: mode.color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#2A2455" }}>
                      {mode.label}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: image + floating chips */}
        <div className="relative flex justify-center lg:justify-end mt-4 lg:mt-0">
          <div className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-floating border border-primary/10">
            <div className="relative bg-surface-variant">
              <img
                src="/doctor-hero.jpg"
                alt="Certified doctor ready to assist you"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/85 via-primary-dark/15 to-transparent" />

              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/92 text-[#0a8a60] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#0a8a60] animate-pulse" />
                Doctors online now
              </div>

              <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-primary-light/90">
                  Our commitment
                </p>
                <p className="text-base font-bold leading-snug text-white tracking-tight">
                  Every doctor on Tabibi is licensed, verified, and dedicated to your health.
                </p>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </section>
  );
}
