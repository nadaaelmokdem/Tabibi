/**
 * Authentication page configuration.
 * Centralizes the props passed to SignIn, SignUp, and Password pages
 * for both user and doctor authentication flows.
 */

import type { AuthFlowConfig } from "../types/config";

export const USER_AUTH_CONFIG: AuthFlowConfig = {
  background: "user-login.jpg",
  headerText: "Care that revolves around you.",
  pText:
    "Join Tabibi today and experience modern healthcare management tailored to your needs.",
  registerLink: "register",
  additionalLink: "user-data",
  signInLink: "login",
  continueDataLink: "user-data",
  requiredRole: "User",
};

export const DOCTOR_AUTH_CONFIG: AuthFlowConfig = {
  background: "doctor-login.jpg",
  headerText: "Bring your expertise to those who need it.",
  pText:
    "Join us today to expand your clinical reach. Effortlessly manage your clinic bookings, consult via video calls, and chat with users seamlessly from anywhere.",
  registerLink: "doctor-register",
  additionalLink: "doctor-data",
  signInLink: "doctor-login",
  continueDataLink: "doctor-data",
  requiredRole: "Doctor",
};

// Admin accounts are seeded/managed, not self-registered - registerLink just
// falls back to the regular patient signup rather than a dedicated admin one.
export const ADMIN_AUTH_CONFIG: AuthFlowConfig = {
  background: "user-login.jpg",
  headerText: "Platform administration.",
  pText:
    "Sign in to manage doctor verification, users, appointments, and platform oversight.",
  registerLink: "register",
  additionalLink: "admin-dashboard",
  signInLink: "admin-login",
  continueDataLink: "admin-dashboard",
  requiredRole: "Admin",
};
