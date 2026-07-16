import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { addToRole } from "../../services/userService";
import authService from "../../services/authService";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { googleLogin, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // "User" or "Doctor"
    const role = state === "Doctor" ? "Doctor" : "User";

    if (!code) {
      setError("No authentication code provided from Google");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await googleLogin({ code, role }, role);
        if (res.isNewUser) {
          // Redirect to register page with prefilled data
          const registerLink = role === "Doctor" ? "/doctor-register" : "/register";
          navigate(registerLink, {
            state: {
              isGoogleSignup: true,
              googleEmail: res.googleEmail,
              googleName: res.googleName,
              googleToken: res.googleToken,
            },
            replace: true
          });
        } else {
          // Logged in successfully, check for role conflict
          const user = res.user;
          const isAdmin = user?.roles?.some((r: string) => r.toLowerCase() === "admin");
          const hasRequiredRole = user?.roles?.includes(role);

          if (role && user?.roles && !hasRequiredRole) {
            if (isAdmin) {
              navigate("/admin-dashboard", { replace: true });
              return;
            }

            Swal.fire({
              title: `Role Conflict`,
              html: `
                <div class="mb-4">
                   <p class="text-on-surface-variant">You are registered as a <span class="font-semibold text-primary-dark">${user.roles.join(", ")}</span>.</p>
                   <p class="text-on-surface-variant mt-2">Do you want to sign in as a ${user.roles.join(", ")} or register as a ${role}?</p>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: `Register as ${role}`,
              cancelButtonText: `Sign in as ${user.roles.join(", ")}`,
              buttonsStyling: false,
              customClass: {
                popup: 'bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-surface-variant',
                title: 'text-2xl font-bold mb-4 text-primary-dark text-left w-full',
                htmlContainer: 'w-full m-0 text-left',
                confirmButton: 'w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5',
                cancelButton: 'w-full mt-3 py-3.5 border-2 border-surface-variant text-on-surface-variant font-bold hover:text-primary-dark hover:border-outline-variant hover:bg-surface-container rounded-xl transition-colors',
                actions: 'flex flex-col w-full m-0 mt-4'
              }
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  await addToRole(user.email, role);
                  await authService.refreshToken();
                  
                  updateUser({
                    roles: [...user.roles, role],
                    activeRole: role
                  });

                  const target = role === "Doctor" ? "/doctor-dashboard" : "/user-dashboard";
                  navigate(target, { replace: true });
                } catch (err: any) {
                  const message = err instanceof Error ? err.message : "Failed to switch roles.";
                  Swal.fire({
                    icon: "error",
                    title: "Something went wrong",
                    text: message,
                    buttonsStyling: false,
                    customClass: {
                      popup: 'bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-sm w-full border border-surface-variant',
                      title: 'text-2xl font-bold mb-2 text-primary-dark',
                      htmlContainer: 'text-on-surface-variant mb-6 m-0',
                      confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg',
                    }
                  });
                }
              } else {
                await logout();
                const fallback = role === "Doctor" ? "login" : "doctor-login";
                navigate(`/${fallback}`, { replace: true });
              }
            });
          } else {
            // Logged in successfully, redirect to dashboards
            const target = role === "Doctor" ? "/doctor-dashboard" : "/user-dashboard";
            navigate(target, { replace: true });
          }
        }
      } catch (err: any) {
        console.error("Google authentication callback failed:", err);
        setError(err?.message || "Google authentication callback failed");
      }
    };

    exchangeCode();
  }, [searchParams, googleLogin, updateUser, logout, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container">
        <div className="bg-white border border-red-200 text-red-500 px-6 py-6 rounded-2xl shadow-xl max-w-md text-center">
          <h2 className="text-xl font-bold mb-3">Authentication Error</h2>
          <p className="mb-5 text-on-surface/80">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition font-semibold"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container">
      <div className="flex flex-col items-center gap-4 bg-white px-8 py-10 rounded-2xl shadow-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="text-on-surface/85 font-semibold text-lg animate-pulse">
          Completing Google authentication...
        </p>
      </div>
    </div>
  );
}
