import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LuCalendarDays,
  LuFolderHeart,
  LuMessageSquare,
  LuLayoutDashboard,
  LuLogOut,
  LuSettings,
  LuX
} from "react-icons/lu";
import { MdMedicalServices } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const isDoctor = user?.roles?.some((r) => r.toLowerCase() === "doctor");
  
  const navItems = isDoctor ? [
    { name: "Doctor Dashboard", icon: LuLayoutDashboard, path: "/doctor-dashboard" },
    { name: "Appointments", icon: LuCalendarDays, path: "/appointments" },
    { name: "Patients", icon: LuFolderHeart, path: "/patients" },
    { name: "Messages", icon: LuMessageSquare, path: "/messages" },
  ] : [
    { name: "Patient Dashboard", icon: LuLayoutDashboard, path: "/patient-dashboard" },
    { name: "Appointments", icon: LuCalendarDays, path: "/appointments" },
    { name: "Find a Doctor", icon: LuFolderHeart, path: "/doctors" },
    { name: "Messages", icon: LuMessageSquare, path: "/messages" },
  ];

  const firstName = user?.fullName?.split(" ")[0] || "User";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <nav className={`bg-white text-text-main text-sm font-semibold fixed left-0 top-0 h-full w-64 flex flex-col border-r border-surface-variant shadow-lg lg:shadow-none z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col justify-between h-full p-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between lg:hidden mb-4">
               <Link 
                 to={isDoctor ? "/doctor-dashboard" : "/patient-dashboard"} 
                 onClick={onClose} 
                 className="text-xl font-bold text-primary flex items-center gap-2 hover:opacity-80 transition-opacity"
               >
                 <MdMedicalServices className="text-primary-light" />
                 Tabibi
               </Link>
               <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main">
                 <LuX className="text-xl" />
               </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              {user?.profilePictureUrl ? (
                <img
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                  src={user.profilePictureUrl}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <h2 className="text-lg font-bold text-primary truncate w-full">
                  {user?.fullName || "User Portal"}
                </h2>
                <p className="text-xs text-text-muted font-normal truncate">
                  {isDoctor ? "Doctor Portal" : "Patient Portal"}
                </p>
              </div>
            </div>
          </div>

          {/* Main Nav */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ease-in-out active:scale-95 ${
                    isActive
                      ? "bg-surface-variant text-primary border-r-4 border-primary"
                      : "text-text-muted hover:bg-surface-variant/50 hover:text-text-main"
                  }`
                }
              >
                <item.icon className="text-lg" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          {/* Bottom Section */}
          <div className="mt-auto space-y-4 pt-4 border-t border-surface-variant">
            <div className="space-y-1">
              <NavLink
                to={isDoctor ? "/doctor-profile" : "/profile"}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ease-in-out active:scale-95 ${
                    isActive
                      ? "bg-surface-variant text-primary border-r-4 border-primary"
                      : "text-text-muted hover:bg-surface-variant/50 hover:text-text-main"
                  }`
                }
              >
                <LuSettings className="text-lg" />
                <span>Profile Settings</span>
              </NavLink>
              <a
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out active:scale-95 cursor-pointer"
                onClick={async () => {
                  navigate("/", { state: { loggingOut: true } });
                  logout();
                }}
              >
                <LuLogOut className="text-lg" />
                <span>Sign Out</span>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
