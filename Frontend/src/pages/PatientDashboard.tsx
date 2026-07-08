import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdCalendarToday,
  MdChatBubble,
  MdAutoAwesome,
  MdHealthAndSafety,
  MdSend,
  MdEventBusy,
  MdAttachFile
} from "react-icons/md";
import PatientService from "../services/patientService";
import ChatService from "../services/chatService";
import { getAiQuota } from "../services/AIChat";
import { useAuth } from "../context/AuthContext";
import type { PatientDashboardData } from "../types/dashboard";
import { formatTimeTo12Hour } from "../utils/dateUtils";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [aiQuota, setAiQuota] = useState<{ freeAiMessages: number, premiumAiMessages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiSubmit = () => {
    if (!aiPrompt.trim()) return;
    navigate('/ai-chat', { state: { initialPrompt: aiPrompt } });
  };

  useEffect(() => {
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
      .catch((err) => setError(err.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="p-8 text-[var(--color-text-main)]/60">Loading your dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-[var(--color-text-main)]/60">
        Couldn't load your dashboard. {error}
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
    <main className="flex-1 p-8 max-w-[1440px] z-10 relative bg-background text-on-background min-h-screen">

      {/* Welcome Hero */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-on-surface">
            {getGreeting()}, {data.fullName.split(' ')[0]}.
          </h1>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <MdCalendarToday className="text-xl" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 relative overflow-hidden rounded-xl shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] h-48 group">
            <img 
              alt="Find Doctors" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              src="find-doctors.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/40 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col justify-center p-6 md:p-8 text-on-primary">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">Find the right care</h2>
              <p className="text-sm md:text-base mb-4 opacity-90 max-w-md">Search through our network of certified specialists and book your next appointment instantly.</p>
              <button 
                onClick={() => navigate('/doctors')} 
                className="cursor-pointer w-fit px-4 py-1.5 md:px-6 md:py-2 bg-surface-container-lowest text-primary rounded-lg text-xs md:text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
              >
                Search Doctors
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Care Partner Widget (AI) */}
        <div className="col-span-1 md:col-span-12 relative shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] rounded-xl z-0 mb-2 bg-surface-container-lowest/80 backdrop-blur-sm p-[1px]">
          {/* Gradient border effect wrapper */}
          <div className="absolute inset-0 z-[-1] rounded-xl bg-gradient-to-br from-primary to-secondary-container"></div>
          
          <div className="p-6 bg-surface-container-lowest/95 rounded-[11px] flex flex-col h-full w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                  <MdAutoAwesome className="text-[20px]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-on-surface">Tabibi AI</h3>
                  <p className="text-xs font-medium text-primary">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  {aiQuota && (
                    <div className="hidden sm:flex items-center mr-2">
                      <span className="text-xs font-medium text-on-surface-variant">
                        {aiQuota.freeAiMessages} free messages left
                      </span>
                      {aiQuota.premiumAiMessages > 0 && (
                        <span className="text-xs font-medium text-primary ml-1">
                           (+{aiQuota.premiumAiMessages} premium)
                        </span>
                      )}
                    </div>
                  )}
                  <button onClick={() => navigate('/ai-chat')} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/5 border border-primary/20 text-primary rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/10 transition-colors shadow-sm whitespace-nowrap">
                    <MdHealthAndSafety className="text-[16px] sm:text-[18px]" />
                    <span>Start Check</span>
                  </button>
              </div>
            </div>
            
            {/* Mini Chat Area */}
            <div className="flex-grow bg-surface-dim/10 rounded-xl p-4 mb-4 border border-surface-variant/30 flex flex-col gap-4 justify-end shadow-inner">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
                  <MdAutoAwesome className="text-[16px]" />
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-2xl rounded-bl-sm border border-surface-variant/50 max-w-[85%] shadow-sm">
                  <p className="text-sm text-on-surface leading-relaxed font-medium">
                    Hello! I'm your Tabibi AI assistant. Please describe your symptoms in as much detail as possible, including when they started.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative mt-2 flex items-center bg-surface-container-high rounded-xl border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all pl-2 shadow-sm">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    navigate('/ai-chat', { state: { initialPrompt: aiPrompt, attachedFile: file } });
                  }
                  if (e.target) e.target.value = "";
                }}
              />
              <button onClick={() => fileInputRef.current?.click()} className="cursor-pointer p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full shrink-0" title="Attach file">
                <MdAttachFile className="text-xl" />
              </button>
              <input 
                className="flex-1 p-3.5 bg-transparent border-none text-base text-on-surface outline-none placeholder-on-surface-variant/70 min-w-0"
                placeholder="Type your health concern or attach a report..." 
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
              />
              <button onClick={handleAiSubmit} className="cursor-pointer p-4 text-primary hover:text-primary/80 transition-colors shrink-0">
                <MdSend className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="col-span-1 md:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border border-surface-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-on-surface">Upcoming Appointments</h2>
              {data.upcomingAppointmentsCount > 0 && <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{data.upcomingAppointmentsCount} total</span>}
            </div>
            <button onClick={() => navigate('/patient-appointments')} className="cursor-pointer text-sm font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-4 flex-1">
            {data.upcomingAppointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8">
                <MdEventBusy className="text-4xl text-on-surface-variant/30 mb-2" />
                <p className="text-sm text-on-surface-variant/80 text-center mb-4">
                  No upcoming appointments yet.
                </p>
                <button onClick={() => navigate('/doctors')} className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors">
                  <MdCalendarToday className="text-lg" />
                  Book an appointment
                </button>
              </div>
            ) : (
              data.upcomingAppointments.map((a, i) => (
                <div key={a.appointmentId}>
                  <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/30 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm text-lg font-bold">
                      {(a.doctorName || "D").replace(/^Dr\.\s*/, '').charAt(0) || 'D'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base text-on-surface font-semibold">
                        {(a.doctorName || "").startsWith("Dr.") ? a.doctorName : `Dr. ${a.doctorName || "Doctor"}`}
                      </h4>
                      <p className="text-sm text-on-surface-variant">{a.consultationType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-on-surface font-semibold">
                        {new Date(a.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}, {formatTimeTo12Hour(new Date(a.scheduledAt))}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[12px] font-medium rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {a.status}
                      </span>
                    </div>
                  </div>
                  {i < data.upcomingAppointments.length - 1 && <hr className="border-surface-variant/30 mt-4" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Chats */}
        <div className="col-span-1 md:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_24px_-4px_rgba(42,36,85,0.08),0_4px_12px_-2px_rgba(42,36,85,0.04)] border border-surface-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-on-surface">Recent Chats</h2>
              {data.chatSessionsCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {data.chatSessionsCount} chats
                </span>
              )}
            </div>
            <button onClick={() => navigate('/messages')} className="cursor-pointer text-sm font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-4 flex-1">
            {recentChats.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center py-8">
                <MdChatBubble className="text-4xl text-on-surface-variant/30 mb-2" />
                <p className="text-sm text-on-surface-variant/80 text-center">
                  No recent chats.
                </p>
               </div>
            ) : (
              recentChats.map((c, i) => (
                <div key={c.sessionId}>
                  <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-variant/30 cursor-pointer" onClick={() => navigate(c.otherPartyUserId === 'AI' ? `/ai-chat/${c.sessionId}` : `/chat/${c.sessionId}`)}>
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm text-lg font-bold">
                      {(c.otherPartyName || "U").replace(/^Dr\.\s*/, '').charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-base text-on-surface font-semibold truncate">
                          {c.otherPartyUserId === 'AI' || (c.otherPartyName || "").startsWith("Dr.") ? (c.otherPartyName || "AI") : `Dr. ${c.otherPartyName || "Doctor"}`}
                        </h4>
                        <span className="text-[12px] text-on-surface-variant font-medium">{c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant truncate">{c.lastMessage || "No messages yet"}</p>
                    </div>
                  </div>
                  {i < recentChats.length - 1 && <hr className="border-surface-variant/30 mt-4" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
