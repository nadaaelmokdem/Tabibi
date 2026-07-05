// Auth-related type definitions

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  isActive: boolean;
  createdAt: string;
  roles?: string[];
}

export interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AppUser | undefined>;
  register: (
    fullName: string,
    email: string,
    password: string,
    phoneNumber: string,
    role?: "patient" | "doctor",
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
  role?: "patient" | "doctor";
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
