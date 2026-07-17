import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import Navbar from "../navbar";
import Sidebar from "../DashboardSidebar";
import { useAuth } from "../../context/AuthContext";
import { LuMenu } from "react-icons/lu";
import { startConnection, stopConnection } from "../../services/chatHubService";
import { FaStethoscope } from "react-icons/fa";

/**
 * Layout wrapper that dynamically renders Navbar or Sidebar based on auth state.
 */
export default function MainLayout() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDoctor = user?.activeRole?.toLowerCase() === "doctor";
  const isAdmin = user?.activeRole?.toLowerCase() === "admin" || user?.roles?.some(r => r.toLowerCase() === "admin");

  useEffect(() => {
    const syncChatConnection = async () => {
      await stopConnection();
      if (isAuthenticated) {
        await startConnection();
      }
    };

    syncChatConnection().catch(console.error);
  }, [isAuthenticated, user?.id, user?.activeRole]);

  return (
    <div className={`flex min-h-screen ${isAuthenticated ? 'bg-surface-container' : ''}`}>
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
              to={isAdmin ? "/admin-dashboard" : isDoctor ? "/doctor-dashboard" : "/user-dashboard"}
              className="ml-3 font-bold text-primary text-lg flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary-light">
                <FaStethoscope size={15} className="text-white" />
              </div>
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
