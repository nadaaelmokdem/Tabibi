import { FcGoogle } from "react-icons/fc";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import type { GoogleButtonProps } from "../../types/props";

export default function GoogleButton({ disabled, isPrimary, requiredRole }: GoogleButtonProps) {
  const { isLoading } = useAuth();

  const login = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: "https://tabibi.dpdns.org/auth/callback",
    scope: "email profile",
    state: requiredRole === "Doctor" ? "Doctor" : "User"
  });

  return (
    <button
      className={`w-full h-11 lg:h-11.5 flex items-center justify-center gap-2.5 rounded-xl text-[13px] lg:text-[14px] leading-[20px] tracking-[0.01em] font-semibold transition-all ${
        isPrimary
          ? "bg-white border-2 border-surface-variant hover:bg-surface-container hover:border-primary-light text-on-surface shadow-sm"
          : "bg-white/90 backdrop-blur-sm border border-surface-variant hover:bg-surface-container hover:border-outline-variant text-on-surface"
      } ${
        disabled || isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
      }`}
      type="button"
      disabled={disabled || isLoading}
      onClick={() => login()}
    >
      <FcGoogle className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
      {isPrimary ? "Sign up with Google" : "Continue with Google"}
    </button>
  );
}