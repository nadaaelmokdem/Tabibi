import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/Home/HeroSection";
import FeaturesSection from "../components/Home/FeaturesSection";
import Footer from "../components/Home/Footer";


/**
 * Home page — the main landing page of the application.
 * Composed from extracted section components for maintainability.
 */
export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated && location.pathname === "/" && !location.state?.loggingOut) {
    const isAdmin = user?.activeRole?.toLowerCase() === "admin";
    const isDoctor = user?.activeRole?.toLowerCase() === "doctor";
    const target = isAdmin ? "/admin-dashboard" : isDoctor ? "/doctor-dashboard" : "/user-dashboard";
    return <Navigate to={target} replace />;
  }
  return (
    <>
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
      </main>

      <Footer />
    </>
  );
}

