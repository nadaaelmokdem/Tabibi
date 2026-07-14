import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LangProvider } from "./context/LangContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DoctorChatPage from "./pages/DoctorChatPage";
import MainLayout from "./components/Layout/MainLayout";
import { USER_AUTH_CONFIG, DOCTOR_AUTH_CONFIG, ADMIN_AUTH_CONFIG } from "./config/authConfig";
import HomePage from "./pages/HomePage";
import AIChatPage from "./pages/AIChatPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import PatientProfilePage from "./pages/PatientProfile";
import DoctorProfilePage from "./pages/DoctorProfile";
import PatientAdditionalData from "./pages/PatientAdditionalData";
import DoctorsPage from "./pages/DoctorsPage";
import DoctorAdditionalData from "./pages/DoctorAdditionalData";
import PatientDashboard from "./pages/PatientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDetailsPage from "./pages/DoctorDetailsPage";
import DoctorAvailabilityPage from "./pages/DoctorAvailabilityPage";
import DoctorAppointmentsPage from "./pages/DoctorAppointmentsPage";
import PatientAppointmentsPage from "./pages/PatientAppointmentsPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import VideoCallPage from "./pages/VideoCallPage";

function AppointmentsRedirect() {
  const { user } = useAuth();
  if (user?.activeRole?.toLowerCase() === "doctor") {
    return <Navigate to="/doctor-appointments" replace />;
  }
  return <Navigate to="/patient-appointments" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LangProvider>
          <Routes>
            {/* Auth Routes (no Navbar) */}
            <Route
              path="/login"
              element={<SignIn {...USER_AUTH_CONFIG} />}
            />
            <Route
              path="/doctor-login"
              element={<SignIn {...DOCTOR_AUTH_CONFIG} />}
            />
            <Route
              path="/admin-login"
              element={<SignIn {...ADMIN_AUTH_CONFIG} />}
            />
            <Route
              path="/register"
              element={<SignUp {...USER_AUTH_CONFIG} />}
            />
            <Route
              path="/doctor-register"
              element={<SignUp {...DOCTOR_AUTH_CONFIG} />}
            />
            <Route
              path="/user-data"
              element={
                <ProtectedRoute allowedRoles={["User"]}>
                  <PatientAdditionalData />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-data"
              element={
                <ProtectedRoute allowedRoles={["Doctor"]}>
                  <DoctorAdditionalData />
                </ProtectedRoute>
              }
            />

            {/* Main Layout Routes (with Navbar) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute>
                    <AppointmentsRedirect />
                  </ProtectedRoute>
                }
              />

              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/doctors/:id" element={<DoctorDetailsPage />} />
              <Route
                path="/ai-chat"
                element={
                  <ProtectedRoute allowedRoles={["User"]}>
                    <AIChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-chat/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={["User"]}>
                    <AIChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <DoctorChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:sessionId"
                element={
                  <ProtectedRoute>
                    <DoctorChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/video-call/:sessionId"
                element={
                  <ProtectedRoute>
                    <VideoCallPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["Doctor"]}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["User"]}>
                    <PatientProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-profile"
                element={
                  <ProtectedRoute allowedRoles={["Doctor"]}>
                    <DoctorProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-appointments"
                element={
                  <ProtectedRoute allowedRoles={["Doctor"]}>
                    <DoctorAppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-availability"
                element={
                  <ProtectedRoute allowedRoles={["Doctor"]}>
                    <DoctorAvailabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient-appointments"
                element={
                  <ProtectedRoute allowedRoles={["User"]}>
                    <PatientAppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["User"]}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/payment-result" element={<PaymentResultPage />} />
            </Route>
            
            {/* Catch-all Route for invalid URLs */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
