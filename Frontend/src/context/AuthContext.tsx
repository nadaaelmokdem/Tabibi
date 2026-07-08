import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import authService from "../services/authService";
import { type AppUser, type AuthContextType } from "../types/auth";
import { useNavigate } from "react-router-dom";
import { setUnauthorizedHandler, setForbiddenHandler } from "../services/api";
import { stopConnection } from "../services/chatHubService";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(
    () => authService.getUser() || null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !!authService.getUser()
  );
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);

  // Handle global 401 unauthorized redirections and 403 forbidden redirections
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate("/login");
    });
    setForbiddenHandler(() => {
      navigate("/");
    });
  }, [navigate]);

  // Initialize auth state
  useEffect(() => {
    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initializeAuth = () => {
      const storedUser = authService.getUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string, requiredRole?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password }, requiredRole);
      if (response.user) {
        setUser(response.user);
        return response.user;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchRole = useCallback((newRole: string) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      
      const reqLower = newRole.toLowerCase();
      const hasRole = prevUser.roles?.some(r => r.toLowerCase() === reqLower);
      if (!hasRole) return prevUser;
      
      const updatedUser = { ...prevUser, activeRole: newRole };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      phoneNumber: string,
      role?: "user" | "doctor",
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.register({
          fullName,
          email,
          password,
          phoneNumber,
          role,
        });
        if (response.user) {
          setUser(response.user);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Sign up failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );


  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await stopConnection();
      await authService.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((patch: Partial<AppUser>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...patch };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    switchRole,
    register,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use the Auth Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
