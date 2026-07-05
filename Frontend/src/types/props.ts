import type { ReactNode } from "react";
import type { IconType } from "react-icons";

export interface SignInProps {
  background: string;
  headerText: string;
  pText: string;
  registerLink: string;
  additionalLink?: string;
  requiredRole?: string;
}

export type UserType = "user" | "doctor";

export interface SignUpProps {
  background: string;
  headerText: string;
  pText: string;
  signInLink: string;
  continueDataLink: string;
}

export interface SignUpForm {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
}

export interface FormFieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  placeholder: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  borderClass: string;
  error?: string;
}

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  togglePassword: () => void;
  disabled: boolean;
  borderClass: string;
  error?: string;
}



export interface SecondaryButtonProps {
  onClick?: () => void;
  disabled: boolean;
  children: ReactNode;
}

export interface AuthLayoutProps {
  /** Background image filename (e.g., 'user-login.jpg') */
  background: string;
  /** Hero heading displayed on the left panel */
  headerText: string;
  /** Hero description displayed on the left panel */
  pText: string;
  /** The form card content */
  children: ReactNode;
  /** Optional: max-width class for the card (default: 'max-w-xl') */
  cardMaxWidth?: string;
}


export interface NavItem {
  name: string;
  icon: IconType;
  path: string;
}

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export interface BrandHeaderProps {
  size?: "medium" | "large";
  title: string;
  subtitle: string;
  onNavigateHome: () => void;
}

export interface ErrorBannerProps {
  message: string;
}

export interface TermsFooterProps {
  actionText?: string;
}

export interface GoogleButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  isPrimary?: boolean;
}
