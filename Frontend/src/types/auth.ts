// Auth-related type definitions

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: string;
  userType?: "user" | "doctor" | "admin";
  roles?: string[];
  activeRole?: string;
  isVerified?: boolean;
}

export interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, requiredRole?: string) => Promise<AppUser | undefined>;
  switchRole: (role: string) => void;
  register: (
    fullName: string,
    email: string,
    password: string,
    phoneNumber: string,
    role?: "user" | "doctor",
  ) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role?: "user" | "doctor";
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AppUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
