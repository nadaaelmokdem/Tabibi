import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LuCalendarDays,
  LuFolderHeart,
  LuMessageSquare,
  LuLayoutDashboard,
  LuLogOut,
  LuSettings,
  LuX,
  LuArrowLeftRight
} from "react-icons/lu";
import { MdMedicalServices, MdVerified } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { HiOutlineSparkles } from "react-icons/hi";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isDoctor = user?.activeRole?.toLowerCase() === "doctor";
  const isAdmin = user?.roles?.some(r => r.toLowerCase() === "admin");
  const hasBothRoles = user?.roles?.some(r => r.toLowerCase() === "doctor") && user?.roles?.some(r => r.toLowerCase() === "user");
  
  const navItems = isAdmin ? [
    { name: "Admin Dashboard", icon: LuLayoutDashboard, path: "/admin-dashboard" },
  ] : isDoctor ? [
    { name: "Doctor Dashboard", icon: LuLayoutDashboard, path: "/doctor-dashboard" },
    { name: "Appointments", icon: LuCalendarDays, path: "/doctor-appointments" },
    { name: "Availability", icon: LuCalendarDays, path: "/doctor-availability" },
    { name: "Messages", icon: LuMessageSquare, path: "/messages" },
  ] : [
    { name: "User Dashboard", icon: LuLayoutDashboard, path: "/user-dashboard" },
    { name: "Chat With AI", icon: HiOutlineSparkles, path: "/ai-chat" },
    { name: "Doctor Chats", icon: MdMedicalServices, path: "/doctor-chats" },
    { name: "Appointments", icon: LuCalendarDays, path: "/patient-appointments" },
    { name: "Browse Doctors", icon: LuFolderHeart, path: "/doctors" },
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
            <div className="flex items-center justify-between mb-8">
               <Link 
                 to={isAdmin ? "/admin-dashboard" : isDoctor ? "/doctor-dashboard" : "/user-dashboard"} 
                 onClick={onClose} 
                 className="text-2xl font-extrabold text-primary flex items-center gap-2 hover:opacity-80 transition-opacity"
               >
                 <MdMedicalServices className="text-primary-light text-3xl" />
                 Tabibi
               </Link>
               <button onClick={onClose} className="lg:hidden p-2 text-text-muted hover:text-text-main">
                 <LuX className="text-xl" />
               </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="relative shrink-0">
                {user?.profilePictureUrl ? (
                  <img
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                    src={user.profilePictureUrl}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl shadow-sm">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                {isDoctor && user?.isVerified && (
                  <MdVerified
                    className="absolute -top-0.5 -right-0.5 text-blue-500 text-base bg-white rounded-full"
                    title="Verified Doctor"
                  />
                )}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-lg font-bold text-primary whitespace-normal break-words w-full">
                  {isDoctor && user?.fullName ? (user.fullName.startsWith("Dr.") ? user.fullName : `Dr. ${user.fullName}`) : user?.fullName || "User Portal"}
                </h2>
                <p className="text-xs text-text-muted font-normal truncate">
                  {isAdmin ? "Admin Portal" : isDoctor ? "Doctor Portal" : "User Portal"}
                </p>
                {hasBothRoles && (
                  <button
                    onClick={() => {
                      switchRole(isDoctor ? "User" : "Doctor");
                      navigate(isDoctor ? "/user-dashboard" : "/doctor-dashboard");
                      onClose();
                    }}
                    className="cursor-pointer flex items-center gap-1 mt-1 text-xs text-[#6a5acd] hover:text-[#5140b3] transition-colors"
                  >
                    <LuArrowLeftRight className="text-[10px]" /> Switch to {isDoctor ? "User" : "Doctor"}
                  </button>
                )}
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
                    isActive || ((item.path === "/doctor-chats" || item.path === "/messages") && location.pathname.startsWith("/chat/"))
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
              {!isAdmin && (
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
              )}
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
