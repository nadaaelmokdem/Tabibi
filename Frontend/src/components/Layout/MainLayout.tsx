import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import Navbar from "../Navbar";
import Sidebar from "../DashboardSidebar";
import { useAuth } from "../../context/AuthContext";
import { LuMenu } from "react-icons/lu";
import { MdMedicalServices } from "react-icons/md";

/**
 * Layout wrapper that dynamically renders Navbar or Sidebar based on auth state.
 */
export default function MainLayout() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDoctor = user?.roles?.some((r) => r.toLowerCase() === "doctor") || user?.userType?.toLowerCase() === "doctor";

  return (
    <div className={`flex min-h-screen ${isAuthenticated ? 'bg-gray-50' : ''}`}>
      {isAuthenticated && (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isAuthenticated ? 'lg:ml-64' : ''}`}>
        {!isAuthenticated ? (
          <Navbar />
        ) : (
          <header className="lg:hidden bg-white border-b border-surface-variant h-16 flex items-center px-4 shrink-0 shadow-sm sticky top-0 z-30">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-text-muted hover:text-primary rounded-lg hover:bg-surface-variant/30 transition-colors"
            >
              <LuMenu className="text-2xl" />
            </button>
            <Link 
              to={isDoctor ? "/doctor-dashboard" : "/patient-dashboard"}
              className="ml-3 font-bold text-primary text-lg flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <MdMedicalServices className="text-primary-light text-xl" />
              Tabibi
            </Link>
          </header>
        )}
        
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
