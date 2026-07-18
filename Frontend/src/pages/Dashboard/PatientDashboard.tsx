import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PatientService from "../../services/patientService";
import ChatService from "../../services/chatService";
import { getAiQuota, rechargeAiQuota } from "../../services/AIChat";
import { showAiRechargeDialog } from "../../utils/swalTheme";
import { useAuth } from "../../context/AuthContext";
import type { PatientDashboardData } from "../../types/dashboard";
import Skeleton from "../../components/common/Skeleton";
import NetworkError from "../../components/common/NetworkError";
import PatientDashboardHeader from "../../components/Dashboard/Patient/PatientDashboardHeader";
import PatientDashboardAIWidget from "../../components/Dashboard/Patient/PatientDashboardAIWidget";
import PatientDashboardAppointments from "../../components/Dashboard/Patient/PatientDashboardAppointments";
import PatientDashboardMessages from "../../components/Dashboard/Patient/PatientDashboardMessages";
import SystemMessageComponent from "../../components/Dashboard/Patient/SystemMessageComponent";

const REVIEW_DISMISSED_KEY = 'review_dismissed_appointment_ids';

function getDismissedReviewIds(): number[] {
  try {
    const stored = localStorage.getItem(REVIEW_DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissReview(appointmentId: number) {
  const dismissedIds = getDismissedReviewIds();
  if (!dismissedIds.includes(appointmentId)) {
    dismissedIds.push(appointmentId);
    localStorage.setItem(REVIEW_DISMISSED_KEY, JSON.stringify(dismissedIds));
  }
}

// Components extracted to separate files

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [aiQuota, setAiQuota] = useState<{ freeAiMessages: number, premiumAiMessages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [dismissedSystemMessages, setDismissedSystemMessages] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_system_messages') || '[]') as string[];
    } catch {
      return [];
    }
  });

  const handleAiSubmit = () => {
    if (!aiPrompt.trim()) return;
    navigate('/ai-chat', { state: { initialPrompt: aiPrompt } });
  };

  const triggerRecharge = () => {
    showAiRechargeDialog(rechargeAiQuota);
  };

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setLoading(true);
        setError(null);
        setData(null);
        setRecentChats([]);
        setAiQuota(null);
      }
    }, 0);

    Promise.all([
      PatientService.getDashboard(),
      ChatService.getSessions(user?.activeRole),
      getAiQuota()
    ])
      .then(([dashboardData, chatSessions, quotaData]) => {
        setData(dashboardData);
        setRecentChats(chatSessions.slice(0, 5));
        setAiQuota(quotaData);
      })
      .catch((err) => { if (active) setError(err.message ?? "Failed to load dashboard"); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [user?.id, user?.activeRole]);

  const availableAppointment = data?.unreviewedAppointments?.find(
    a => !getDismissedReviewIds().includes(a.appointmentId) && !dismissedSystemMessages.includes(`system_msg_${a.doctorId}`)
  );
  const showSystemMessage = !!availableAppointment;
  const systemMessageDoctor = availableAppointment?.doctorName || '';
  const reviewAppointment = availableAppointment || null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReviewSubmit = async (appointmentId: number, rating: number, comment: string) => {
    try {
      await PatientService.submitReview(appointmentId, rating, comment);
      dismissReview(appointmentId);
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          unreviewedAppointments: prev.unreviewedAppointments.filter(a => a.appointmentId !== appointmentId)
        };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    }
  };

  const handleSystemMessageDiscard = (doctorId: number) => {
    const key = `system_msg_${doctorId}`;
    if (!dismissedSystemMessages.includes(key)) {
      const updated = [...dismissedSystemMessages, key];
      setDismissedSystemMessages(updated);
      localStorage.setItem('dismissed_system_messages', JSON.stringify(updated));
    }
  };

  const handleSystemMessageRate = (rating: number, comment: string) => {
    if (reviewAppointment) {
      handleReviewSubmit(reviewAppointment.appointmentId, rating, comment);
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

  if (error || !data) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] z-10 relative flex items-center justify-center min-h-[50vh]">
        <NetworkError />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] z-10 relative bg-background text-on-background min-h-screen">
      <PatientDashboardHeader 
        fullName={data.fullName}
        getGreeting={getGreeting}
        formattedDate={formattedDate}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Care Partner Widget (AI) */}
        <PatientDashboardAIWidget 
          showSystemMessage={showSystemMessage}
          systemMessageDoctor={systemMessageDoctor}
          aiQuota={aiQuota}
          fileInputRef={fileInputRef}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          handleAiSubmit={handleAiSubmit}
          onRechargeClick={triggerRecharge}
        />

        {/* Dynamic Feedback Widget (1/3 Width on Desktop, Stacked on Mobile/Tablet) */}
        {showSystemMessage && systemMessageDoctor && (
          <div className="col-span-1 md:col-span-12 lg:col-span-4 transition-all duration-300">
            <SystemMessageComponent
              doctorName={systemMessageDoctor}
              doctorId={reviewAppointment?.doctorId}
              doctorProfilePictureUrl={reviewAppointment?.doctorProfilePictureUrl}
              onRate={handleSystemMessageRate}
              onDiscard={() => handleSystemMessageDiscard(reviewAppointment?.doctorId || 0)}
            />
          </div>
        )}

        {/* Active Consultations */}
        <PatientDashboardAppointments 
          activeConsultations={data.activeConsultations}
          activeConsultationsCount={data.activeConsultationsCount}
        />

        {/* Recent Chats */}
        <PatientDashboardMessages 
          recentChats={recentChats}
          chatSessionsCount={data.chatSessionsCount}
        />
      </div>
    </main>
  );
}