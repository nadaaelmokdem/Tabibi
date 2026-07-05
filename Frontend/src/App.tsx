import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LangProvider } from "./context/LangContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ConsultationChat from "./pages/ConsultationChat";
import MainLayout from "./components/Layout/MainLayout";
import { USER_AUTH_CONFIG, DOCTOR_AUTH_CONFIG, ADMIN_AUTH_CONFIG } from "./config/authConfig";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import PatientProfilePage from "./pages/PatientProfile";
import DoctorProfilePage from "./pages/DoctorProfile";
import PatientAdditionalData from "./pages/PatientAdditionalData";
import DoctorAdditionalData from "./pages/DoctorAdditionalData";
import PatientDashboard from "./pages/PatientDashboard";
import AdminDashboard from "./pages/AdminDashboard";

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
            <Route path="/user-data" element={<PatientAdditionalData />} />
            <Route path="/doctor-data" element={<DoctorAdditionalData />} />

            {/* Main Layout Routes (with Navbar) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/appointments" element={<HomePage />} />
              <Route path="/messages" element={<HomePage />} />
              <Route path="/doctors" element={<HomePage />} />
              <Route
                path="/ai-chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
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
                  <ProtectedRoute>
                    <PatientProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-profile"
                element={
                  <ProtectedRoute>
                    <DoctorProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultation/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={["User", "Doctor"]}>
                    <ConsultationChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient-dashboard"
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
            </Route>
          </Routes>
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
