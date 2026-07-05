import { MdOutlineMail, MdArrowForward } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { addToRole } from "../services/userService";
import AuthLayout from "../components/Auth/AuthLayout";
import BrandHeader from "../components/Auth/BrandHeader";
import ErrorBanner from "../components/Auth/ErrorBanner";
import Divider from "../components/Auth/Divider";
import TermsFooter from "../components/Auth/TermsFooter";
import GoogleButton from "../components/Auth/GoogleButton";
import FormField from "../components/common/FormField";
import PasswordField from "../components/common/PasswordField";

import type { SignInProps } from "../types/props";

/** Email validation regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TabibiLogin({
  background,
  headerText,
  pText,
  registerLink,
  additionalLink,
  requiredRole,
}: SignInProps) {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayError, setDisplayError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
    if (displayError && EMAIL_REGEX.test(value)) {
      setDisplayError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
    if (displayError && value) {
      setDisplayError("");
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDisplayError("");
    
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email, password);

      if (requiredRole && user?.roles && !user.roles.includes(requiredRole)) {
        Swal.fire({
          title: `You are registered as a ${user.roles.join(", ")}.`,
          text: `Do you want to sign in as a ${user.roles.join(", ")} or register as a ${requiredRole}?`,
          showCancelButton: true,
          confirmButtonText: "Register here",
          cancelButtonText: `Go to ${requiredRole === "Doctor" ? "User" : "Doctor"} login`,
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addToRole(email, requiredRole);
              await login(email, password);
              if (additionalLink) {
                navigate(`/${additionalLink}`);
              } else {
                navigate("/");
              }
            } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to switch roles.";
            Swal.fire({
              icon: "error",
              title: "Something went wrong",
              text: message,
            });
          }
          } else {
            logout();
            navigate(`/${requiredRole === "Doctor" ? "login" : "doctor-login"}`);
          }
        });
        return;
      }

      navigate("/");
    } catch (error) {
      if (
        error instanceof AxiosError &&
        error.response?.data === "Invalid Email Or Password"
      ) {
        setDisplayError("Invalid Email Or Password!");
      } else {
        setDisplayError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInputBorderClass = (hasError: boolean) =>
    hasError
      ? "border-red-400 focus:ring-red-400 focus:border-red-400"
      : "border-[#e5deff] focus:ring-[#b8a7ff] focus:border-[#b8a7ff]";

  return (
    <AuthLayout background={background} headerText={headerText} pText={pText}>
      {/* Toggle */}
      <div className="flex w-full bg-[#f0ebff] rounded-full p-1 mb-0.5">
        <button
          type="button"
          className="flex-1 py-1.5 text-[13px] lg:text-[14px] font-semibold rounded-full transition-all bg-[#6a5acd] text-white shadow-sm"
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => navigate(`/${registerLink}`)}
          className="flex-1 py-1.5 text-[13px] lg:text-[14px] font-semibold rounded-full transition-all text-[#6a5acd] hover:bg-[#e5deff] cursor-pointer"
        >
          Register
        </button>
      </div>

      {/* Brand Header */}
      <BrandHeader
        size="medium"
        title="Welcome Back"
        subtitle="Sign in to continue to Tabibi"
        onNavigateHome={() => navigate("/")}
      />

      {/* Form */}
      <form
        className="flex flex-col gap-2 lg:gap-3"
        onSubmit={handleLogin}
        noValidate
      >
        {displayError && <ErrorBanner message={displayError} />}

        <FormField
          id="email"
          label="Email Address"
          icon={
            <MdOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9c4d5] pointer-events-none text-lg" />
          }
          placeholder="name@example.com"
          type="email"
          value={email}
          onChange={handleEmailChange}
          disabled={isLoading}
          borderClass={getInputBorderClass(!!displayError || !!errors.email)}
          error={errors.email}
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={handlePasswordChange}
          showPassword={showPassword}
          togglePassword={() => setShowPassword(!showPassword)}
          disabled={isLoading}
          borderClass={getInputBorderClass(!!displayError || !!errors.password)}
          error={errors.password}
        />

        <button
          disabled={isLoading}
          className={`w-full h-9 lg:h-10 flex items-center justify-center gap-2 bg-[#6a5acd] text-[#f0ebff] rounded-full text-[14px] leading-[20px] tracking-[0.01em] font-semibold transition-all shadow-md ${
            isLoading
              ? "opacity-70 cursor-not-allowed"
              : "hover:bg-[#5140b3] hover:text-[#ffffff] cursor-pointer"
          }`}
          type="submit"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Log In</span>
              <MdArrowForward className="text-lg lg:text-xl" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <Divider />

      {/* Google Sign-in */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <GoogleButton disabled={isLoading} />
      </div>

      {/* Footer */}
      <TermsFooter />
    </AuthLayout>
  );
}
