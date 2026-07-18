import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import type { ScheduleItem } from "../../components/DoctorDashboard/ScheduleItem";
import CalendarModal from "../../components/DoctorDashboard/CalendarModal";
import { formatTimeTo12Hour } from "../../utils/dateUtils";
import { formatMessagePreview } from "../../utils/textUtils";
import ChatService from "../../services/chatService";
import { onUserPresenceChanged, subscribeToPresence } from "../../services/chatHubService";
import { useAuth } from "../../context/AuthContext";
import DoctorService from "../../services/doctorService";
import type { DoctorDashboardData } from "../../types/dashboard";
import Skeleton from "../../components/common/Skeleton";
import DoctorDashboardHeader from "../../components/Dashboard/Doctor/DoctorDashboardHeader";
import DoctorDashboardSchedule from "../../components/Dashboard/Doctor/DoctorDashboardSchedule";
import DoctorDashboardMessages from "../../components/Dashboard/Doctor/DoctorDashboardMessages";

function formatLastMessagePreview(
  lastMessage: string,
  lastMessageRole: string | undefined | null,
  viewerRole: string,
): string {
  if (!lastMessage?.trim()) return "";
  const preview = formatMessagePreview(lastMessage);
  const isOwn = lastMessageRole?.toLowerCase() === viewerRole.toLowerCase();
  return isOwn ? `You: ${preview}` : preview;
}

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<DoctorDashboardData | null>(null);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    let currentSessions: any[] = [];
    setLoading(true);
    setDashboardData(null);
    setAllAppointments([]);
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

    DoctorService.getAppointments({ status: "Confirmed" })
      .then((data) => {
        setAllAppointments(data);
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
        import("../../services/chatHubService").then((m) =>
          m.unsubscribeFromPresence(s.otherPartyUserId).catch(() => {}),
        );
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.activeRole, updateUser]);

  const handleCancelAppointment = async (id: number) => {
    if (!window.confirm("Cancel this appointment? The patient will be notified.")) return;
    setCancellingId(id);
    try {
      await DoctorService.cancelAppointment(id);
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          activeConsultations: dashboardData.activeConsultations.filter(
            (a) => a.appointmentId !== id,
          ),
          activeConsultationsCount: Math.max(0, (dashboardData.activeConsultationsCount || 0) - 1),
        });
      }
      setAllAppointments((prev) => prev.filter((a) => a.appointmentId !== id));
      toast.success("Appointment cancelled.");
    } catch {
      toast.error("Failed to cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] z-10 relative">
        <Skeleton className="h-48 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Skeleton className="col-span-1 md:col-span-12 h-40" />
          <Skeleton className="col-span-1 md:col-span-6 h-64" />
          <Skeleton className="col-span-1 md:col-span-6 h-64" />
        </div>
      </div>
    );
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
    dashboardData?.activeConsultations.map((app) => {
      const d = new Date(app.scheduledAt);
      return {
        id: app.appointmentId,
        time: formatTimeTo12Hour(d),
        duration: "30 min",
        name: app.patientName || "Patient",
        type: "Consultation",
        badge: app.consultationType,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        initials: (app.patientName || "P").charAt(0).toUpperCase() || "P",
        paymentMethod: app.paymentMethod,
        avatar: app.doctorProfilePictureUrl,
        sessionId: app.sessionId,
        scheduledAt: app.scheduledAt,
      } as ScheduleItem;
    }) || [];
  const calendarSchedule =
    allAppointments.map((app) => {
      const d = new Date(app.scheduledAt);
      return {
        id: app.appointmentId,
        time: formatTimeTo12Hour(d),
        duration: "30 min",
        name: app.patientName || "Patient",
        type: "Consultation",
        badge: app.consultationType,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        initials: (app.patientName || "P").charAt(0).toUpperCase() || "P",
        paymentMethod: app.paymentMethod,
      } as ScheduleItem;
    }) || [];

  const isVerified = dashboardData?.isVerified ?? false;
  const verificationStatus = dashboardData?.verificationStatus ?? "Pending";

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] z-10 relative bg-background text-on-background min-h-screen">
      <DoctorDashboardHeader 
        doctorFirstName={doctorFirstName}
        getGreeting={getGreeting}
        formattedDate={formattedDate}
        isVerified={isVerified}
        verificationStatus={verificationStatus}
        dashboardData={dashboardData}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <DoctorDashboardSchedule 
          dashboardData={dashboardData}
          mappedSchedule={mappedSchedule}
          isVerified={isVerified}
          cancellingId={cancellingId}
          handleCancelAppointment={handleCancelAppointment}
          setIsCalendarOpen={setIsCalendarOpen}
        />

        <DoctorDashboardMessages 
          sessions={sessions}
          isVerified={isVerified}
          onlineUsers={onlineUsers}
          userRole={user?.activeRole ?? "Doctor"}
          formatLastMessagePreview={formatLastMessagePreview}
        />
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        schedule={calendarSchedule}
        onCancelAppointment={handleCancelAppointment}
      />
    </main>
  );
}
