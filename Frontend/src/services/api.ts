import axios from "axios";
import authService from "./authService";

const DEFAULT_BASE_URL = "http://localhost:5009/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

export const setForbiddenHandler = (handler: () => void) => {
  onForbidden = handler;
};

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry the refresh-token endpoint itself to avoid infinite loops
    if (originalRequest.url?.includes("/refresh-token")) {
      return Promise.reject(error);
    }

    // If the error is 401 or 403
    if ((error.response?.status === 401 || error.response?.status === 403)) {
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Refresh the token (this sets the HTTP-only cookie automatically)
          await authService.refreshToken();

          // Retry the original request with the new cookie
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear user state and redirect to login
          localStorage.removeItem("user");
          if (onUnauthorized) {
            onUnauthorized();
          } else {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        }
      } else if (error.response?.status === 403) {
        if (onForbidden) {
          onForbidden();
        } else {
          window.location.href = "/";
        }
      } else {
        // If it was already retried for 401, redirect to login
        localStorage.removeItem("user");
        if (onUnauthorized) {
          onUnauthorized();
        } else {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
