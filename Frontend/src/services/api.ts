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

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry the refresh-token endpoint itself to avoid infinite loops
    if (originalRequest.url?.includes("/refresh-token")) {
      return Promise.reject(error);
    }

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh the token (this sets the HTTP-only cookie automatically)
        await authService.refreshToken();

        // Retry the original request with the new cookie
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, reject the promise
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
