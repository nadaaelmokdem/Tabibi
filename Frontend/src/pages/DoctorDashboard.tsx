import { useState, useEffect } from "react";
import {
  MdAttachMoney,
  MdCalendarMonth,
  MdChevronRight,
  MdChatBubble,
} from "react-icons/md";
import StatCard from "../components/DoctorDashboard/StatCard";
import ScheduleItemComponent, {
  type ScheduleItem,
} from "../components/DoctorDashboard/ScheduleItem";
import CalendarModal from "../components/DoctorDashboard/CalendarModal";
import { useNavigate } from "react-router-dom";
import { getTodayStr, formatTimeTo12Hour } from "../utils/dateUtils";
import ChatService from "../services/chatService";
import { onUserPresenceChanged, subscribeToPresence } from "../services/chatHubService";
import { useAuth } from "../context/AuthContext";
import DoctorService from "../services/doctorService";
import type { DoctorDashboardData } from "../types/dashboard";



export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<DoctorDashboardData | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let currentSessions: any[] = [];
    DoctorService.getDashboard().then(data => {
      setDashboardData(data);
      // Fallback for chat sessions if the dashboard provides it
      if (data.chatSessions) {
        setSessions(data.chatSessions);
      }
      setLoading(false);
    }).catch(console.error);

    ChatService.getSessions(user?.activeRole).then((data) => {
      setSessions(data);
      currentSessions = data;
      data.forEach(s => {
        subscribeToPresence(s.otherPartyUserId).catch(console.error);
      });
    }).catch(console.error);

    const handlePresence = (userId: string, isOnline: boolean) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
    };

    onUserPresenceChanged(handlePresence);

    return () => {
      currentSessions.forEach(s => {
        import("../services/chatHubService").then(m => m.unsubscribeFromPresence(s.otherPartyUserId).catch(() => {}));
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancelAppointment = (id: number) => {
    // In the future this would hit an API to cancel
    if (window.confirm("Cancel this appointment?")) {
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          todaysAppointments: dashboardData.todaysAppointments.filter(a => a.appointmentId !== id)
        });
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-[var(--color-text-main)]/60">Loading your dashboard...</div>;
  }

  const mappedSchedule = dashboardData?.todaysAppointments.map(app => {
    const d = new Date(app.scheduledAt);
    return {
      id: app.appointmentId,
      time: formatTimeTo12Hour(d),
      duration: "30 min",
      name: app.patientName || "Patient",
      type: "Consultation",
      badge: app.consultationType,
      date: getTodayStr(),
      initials: (app.patientName || "P").charAt(0).toUpperCase() || 'P'
    } as ScheduleItem;
  }) || [];

  return (
    <div className="w-full bg-[#FBFAFF] p-4 md:p-8 min-h-screen relative">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Patients Seen"
          value={dashboardData?.totalPatientsSeen || 0}
          icon={MdAttachMoney}
        />
        <StatCard
          title="Chats"
          value={sessions.length}
          subtext="Active conversations"
          icon={MdChatBubble}
        />
        <StatCard
          title="Today's Appointments"
          value={dashboardData?.todaysAppointmentsCount || 0}
          icon={MdCalendarMonth}
          isPrimary
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily Schedule Section */}
        <div className="xl:col-span-2 bg-white rounded-[1.5rem] border border-[#E6E1FF] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-[#2A2455]">Daily Schedule</h3>
            </div>
            <div className="flex gap-4">
              <button onClick={() => navigate('/doctor-appointments')} className="cursor-pointer text-sm font-medium text-[#6A5ACD] hover:underline">View all</button>
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="text-[#6A5ACD] text-sm font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                View Calendar <MdChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {mappedSchedule.length > 0 ? (
              mappedSchedule.map((item) => (
                <ScheduleItemComponent
                  key={item.id}
                  item={item}
                  onCancel={handleCancelAppointment}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No appointments for today.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">

          {/* Messages */}
          <div className="bg-white rounded-[1.5rem] border border-[#E6E1FF] shadow-sm p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[#2A2455]">
              <MdChatBubble size={18} className="text-[#6A5ACD]" /> Recent
              Messages
            </h3>
            <div className="flex flex-col">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No active chat sessions.</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => navigate(`/chat/${session.sessionId}`)}
                    className="flex items-start gap-3 p-3 hover:bg-[#F8F7FF] rounded-xl transition-all cursor-pointer border-b border-gray-50 last:border-0 group"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#E6E1FF] text-[#6A5ACD] flex items-center justify-center font-bold text-xs">
                        {(session.otherPartyName || "U").charAt(0).toUpperCase() || 'U'}
                      </div>
                      {onlineUsers[session.otherPartyUserId] && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className="font-bold text-xs text-[#2A2455] truncate group-hover:text-[#6A5ACD] transition-colors">
                          {session.otherPartyName || "User"}
                        </div>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {session.lastMessageTime ? formatTimeTo12Hour(new Date(session.lastMessageTime)) : ""}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {session.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        schedule={mappedSchedule}
        onCancelAppointment={handleCancelAppointment}
      />
    </div>
  );
}
