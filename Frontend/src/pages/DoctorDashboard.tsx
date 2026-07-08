import { useState, useEffect } from "react";
import {
  MdChevronRight,
  MdChatBubble,
  MdCalendarToday,
  MdEventBusy,
  MdSchedule,
  MdPendingActions,
} from "react-icons/md";
import { toast } from "react-toastify";
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

function formatLastMessagePreview(
  lastMessage: string,
  lastMessageRole: string | undefined | null,
  viewerRole: string,
): string {
  if (!lastMessage.trim()) return "";
  const isOwn = lastMessageRole?.toLowerCase() === viewerRole.toLowerCase();
  return isOwn ? `You: ${lastMessage}` : lastMessage;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<DoctorDashboardData | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    let currentSessions: any[] = [];
    setLoading(true);
    setDashboardData(null);
    setSessions([]);
    setOnlineUsers({});

    DoctorService.getDashboard()
      .then((data) => {
        setDashboardData(data);
        if (user && data.isVerified !== user.isVerified) {
          updateUser({ isVerified: data.isVerified });
        }
        setLoading(false);
      })
      .catch(console.error);

    ChatService.getSessions(user?.activeRole ?? "Doctor")
      .then((data) => {
        setSessions(data.slice(0, 5));
        currentSessions = data;
        data.forEach((s) => {
          subscribeToPresence(s.otherPartyUserId).catch(console.error);
        });
      })
      .catch(console.error);

    const handlePresence = (userId: string, isOnline: boolean) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: isOnline }));
    };

    onUserPresenceChanged(handlePresence);

    return () => {
      currentSessions.forEach((s) => {
        import("../services/chatHubService").then((m) =>
          m.unsubscribeFromPresence(s.otherPartyUserId).catch(() => {}),
        );
      });
    };
  }, [user?.id, user?.activeRole, updateUser]);

  const handleCancelAppointment = async (id: number) => {
    if (!window.confirm("Cancel this appointment? The patient will be notified.")) return;
    setCancellingId(id);
    try {
      await DoctorService.cancelAppointment(id);
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          todaysAppointments: dashboardData.todaysAppointments.filter(
            (a) => a.appointmentId !== id,
          ),
          todaysAppointmentsCount: Math.max(0, (dashboardData.todaysAppointmentsCount || 0) - 1),
        });
      }
      toast.success("Appointment cancelled.");
    } catch {
      toast.error("Failed to cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-on-surface-variant/60">Loading your dashboard...</div>;
  }

  const doctorFirstName =
    dashboardData?.fullName?.split(" ")[0] ||
    user?.fullName?.replace(/^Dr\.\s*/i, "").split(" ")[0] ||
    "Doctor";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const mappedSchedule =
    dashboardData?.todaysAppointments.map((app) => {
      const d = new Date(app.scheduledAt);
      return {
        id: app.appointmentId,
        time: formatTimeTo12Hour(d),
        duration: "30 min",
        name: app.patientName || "Patient",
        type: "Consultation",
        badge: app.consultationType,
        date: getTodayStr(),
        initials: (app.patientName || "P").charAt(0).toUpperCase() || "P",
      } as ScheduleItem;
    }) || [];

  const isVerified = dashboardData?.isVerified ?? false;
  const verificationStatus = dashboardData?.verificationStatus ?? "Pending";

  return (
    <main className="flex-1 p-8 max-w-[1440px] z-10 relative bg-background text-on-background min-h-screen">
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-on-surface">
            {getGreeting()}, Dr. {doctorFirstName}.
          </h1>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <MdCalendarToday className="text-xl" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
        </div>

        {!isVerified && (
          <div
            className={`mb-6 rounded-xl border p-4 flex items-start gap-3 ${
              verificationStatus === "Rejected"
                ? "bg-red-50 border-red-200 text-red-800"
                : verificationStatus === "NeedsChanges"
                  ? "bg-orange-50 border-orange-200 text-orange-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}
          >
            <MdPendingActions className="text-2xl shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                {verificationStatus === "Pending" && "Your profile is pending admin verification"}
                {verificationStatus === "NeedsChanges" && "Changes requested on your profile"}
                {verificationStatus === "Rejected" && "Your application was rejected"}
              </p>
              <p className="text-sm mt-1 opacity-90">
                {verificationStatus === "Pending"
                  ? "You won't appear in patient search until approved. Appointments and chats are unavailable until verification."
                  : dashboardData?.adminComment || "Please review your profile and resubmit."}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 relative overflow-hidden rounded-xl shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] h-48 group">
            <img
              alt="Manage your practice"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              src="/find-doctors.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/40 to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-center p-6 md:p-8 text-on-primary">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">Manage your practice</h2>
              <p className="text-sm md:text-base mb-4 opacity-90 max-w-md">
                Review today&apos;s schedule, update your availability, and stay connected with patients.
              </p>
              <button
                onClick={() => navigate("/doctor-availability")}
                className="cursor-pointer w-fit px-4 py-1.5 md:px-6 md:py-2 bg-surface-container-lowest text-primary rounded-lg text-xs md:text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
              >
                Manage Availability
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border border-surface-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-on-surface">Daily Schedule</h2>
              {(dashboardData?.todaysAppointmentsCount ?? 0) > 0 && (
                <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {dashboardData?.todaysAppointmentsCount} today
                </span>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => navigate("/doctor-appointments")}
                className="cursor-pointer text-sm font-medium text-primary hover:underline"
              >
                View all
              </button>
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="cursor-pointer text-sm font-medium text-primary flex items-center gap-0.5 hover:underline"
              >
                Calendar <MdChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {mappedSchedule.length > 0 ? (
              mappedSchedule.map((item, i) => (
                <div key={item.id}>
                  <ScheduleItemComponent
                    item={item}
                    onCancel={handleCancelAppointment}
                    cancelling={cancellingId === item.id}
                  />
                  {i < mappedSchedule.length - 1 && (
                    <hr className="border-surface-variant/30 mt-4" />
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8">
                <MdEventBusy className="text-4xl text-on-surface-variant/30 mb-2" />
                <p className="text-sm text-on-surface-variant/80 text-center mb-4">
                  {isVerified
                    ? "No appointments for today."
                    : "Appointments will appear here once your profile is verified."}
                </p>
                <button
                  onClick={() => navigate("/doctor-availability")}
                  className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors"
                >
                  <MdSchedule className="text-lg" />
                  Set availability
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border border-surface-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-on-surface">Recent Messages</h2>
              {sessions.length > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {sessions.length} chats
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/messages")}
              className="cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {sessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8">
                <MdChatBubble className="text-4xl text-on-surface-variant/30 mb-2" />
                <p className="text-sm text-on-surface-variant/80 text-center">
                  {isVerified
                    ? "No active chat sessions."
                    : "Patient chats will be available once your profile is verified."}
                </p>
              </div>
            ) : (
              sessions.map((session, i) => (
                <div key={session.sessionId}>
                  <div
                    onClick={() => navigate(`/chat/${session.sessionId}`)}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/30 cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-sm text-lg font-bold">
                        {(session.otherPartyName || "U").charAt(0).toUpperCase() || "U"}
                      </div>
                      {onlineUsers[session.otherPartyUserId] && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-base text-on-surface font-semibold truncate">
                          {session.otherPartyName || "User"}
                        </h4>
                        <span className="text-[12px] text-on-surface-variant font-medium ml-2 shrink-0">
                          {session.lastMessageTime
                            ? formatTimeTo12Hour(new Date(session.lastMessageTime))
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant truncate">
                        {formatLastMessagePreview(
                          session.lastMessage,
                          session.lastMessageRole,
                          user?.activeRole ?? "Doctor",
                        ) || "No messages yet"}
                      </p>
                    </div>
                  </div>
                  {i < sessions.length - 1 && (
                    <hr className="border-surface-variant/30 mt-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        schedule={mappedSchedule}
        onCancelAppointment={handleCancelAppointment}
      />
    </main>
  );
}
