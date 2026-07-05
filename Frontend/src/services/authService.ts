import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  AppUser,
} from "../types/auth";
import api from "./api";

const AUTH_API = "/auth";

class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${AUTH_API}/login`,
      credentials,
      { withCredentials: true },
    );

    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  }

  /**
   * Register a new account
   */
  async register(data: SignupRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${AUTH_API}/register`,
      data,
      { withCredentials: true },
    );
    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  }



  private refreshTokenPromise: Promise<AuthResponse> | null = null;

  /**
   * Refresh the auth token
   */
  async refreshToken(): Promise<AuthResponse> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await api.post<AuthResponse>(
          `${AUTH_API}/refresh-token`,
          {},
        );

        return response.data;
      } catch (error) {
        throw error;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  getUser(): AppUser | undefined {
    const raw = localStorage.getItem("user");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as AppUser;
    } catch (e) {
      console.warn("Failed to parse stored user", e);
      return undefined;
    }
  }

  /**
   * Logout - clear local storage and auth header
   */
  async logout(): Promise<void> {
    localStorage.removeItem("user");
    await api.post(`${AUTH_API}/logout`, { withCredentials: true });
  }
}

export async function checkEmail(
  email: string,
  isDoctor: boolean,
): Promise<void> {
  await api.post(`${AUTH_API}/check-email`, { email, isDoctor });
}

export default new AuthService();
