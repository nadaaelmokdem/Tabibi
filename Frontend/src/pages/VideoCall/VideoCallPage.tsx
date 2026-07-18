import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaPhoneSlash,
  FaCommentDots,
  FaTimes,
  FaPaperPlane,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaUser,
  FaUserMd,
  FaClock,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { videoCallHubService } from "../../services/videoCallHubService";
import authService from "../../services/authService";
import api from "../../services/api";
import { toast } from "react-toastify";
import type { ChatMessage } from "../../types/chat";

interface SessionDetails {
  sessionId: number;
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  meetingLink?: string;
  scheduledAt: string;
  actualStartedAt?: string;
  status: string;
}

export default function VideoCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userRef = useRef(user);
  const meetWindowRef = useRef<Window | null>(null);
  const meetWindowTimerRef = useRef<any>(null);

  useEffect(() => {
    userRef.current = user;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    const handleUnload = () => {
      cleanupMeetWindow();
    };

    window.addEventListener("unload", handleUnload);
    return () => {
      window.removeEventListener("unload", handleUnload);
    };
  }, [user]);

  const parsedSessionId = sessionId ? parseInt(sessionId, 10) : undefined;

  // 1. Fetch Session Details (including Google Meet Link)
  useEffect(() => {
    if (isLoading || !user?.id || !parsedSessionId) return;

    const fetchSession = async () => {
      try {
        const response = await api.get<SessionDetails>(`/VideoCall/session/${parsedSessionId}`);
        setSessionDetails(response.data);

        // If the call was already marked as active on the backend, compute duration
        if (response.data.actualStartedAt) {
          setIsMeetingStarted(true);
          const start = new Date(response.data.actualStartedAt).getTime();
          const now = new Date().getTime();
          const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
          setCallDurationSeconds(diffSeconds);
        }
      } catch (err) {
        console.error("Failed to load session details:", err);
        toast.error("Could not load consultation room details.");
      }
    };

    fetchSession();
  }, [parsedSessionId, isLoading, user?.id]);

  // 2. Initialize SignalR Connection
  useEffect(() => {
    if (isLoading || !user?.id || !parsedSessionId) return;

    let active = true;
    const connectHub = async () => {
      try {
        await videoCallHubService.joinCall(parsedSessionId);
        if (active) {
          console.log("Successfully joined the video call SignalR room.");
        }
      } catch (err) {
        if (active) {
          console.error("Failed to connect to video call SignalR hub:", err);
          toast.error("SignalR connection failed. Real-time updates might be restricted.");
        }
      }
    };

    connectHub();

    return () => {
      active = false;
      cleanupMeetWindow();
      videoCallHubService.leaveCall(parsedSessionId).catch(console.error);
    };
  }, [parsedSessionId, isLoading, user?.id]);

  // 3. Listen for SignalR Event: UserJoined (both users now in lobby, meeting started)
  useEffect(() => {
    const handleUserJoined = (joinedUserId: string) => {
      const localId = user?.id?.toLowerCase();
      if (localId && joinedUserId.toLowerCase() !== localId) {
        setIsMeetingStarted(true);
        toast.info("Other participant has entered the lobby!");
      }
    };

    videoCallHubService.on("UserJoined", handleUserJoined);
    return () => {
      videoCallHubService.off("UserJoined", handleUserJoined);
    };
  }, [user?.id]);

  // 4. Listen for SignalR Event: RoomPresence (checking if someone else is already here)
  useEffect(() => {
    const handleRoomPresence = (userIds: string[]) => {
      const localId = user?.id?.toLowerCase();
      if (localId) {
        const others = userIds.filter((id) => id.toLowerCase() !== localId);
        if (others.length > 0) {
          setIsMeetingStarted(true);
        }
      }
    };

    videoCallHubService.on("RoomPresence", handleRoomPresence);
    return () => {
      videoCallHubService.off("RoomPresence", handleRoomPresence);
    };
  }, [user?.id]);

  // 5. Timer logic: Enforcing 30 minutes limits on frontend
  useEffect(() => {
    if (isMeetingStarted) {
      const interval = setInterval(() => {
        setCallDurationSeconds((prev) => {
          const next = prev + 1;

          // 25 minutes = 1500 seconds
          if (next === 1500) {
            setShowWarning(true);
          }

          // 30 minutes = 1800 seconds
          if (next >= 1800) {
            clearInterval(interval);
            handleCallTimeout();
          }

          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isMeetingStarted]);

  // 6. Handle Call Timeout (both frontend timer and SignalR CallTimeExpired event)
  const handleCallTimeout = () => {
    cleanupMeetWindow();
    toast.error("The 30-minute consultation time limit has expired.");
    const currentUser = authService.getUser() || userRef.current;
    const isDoctor =
      currentUser?.activeRole === "Doctor" ||
      currentUser?.roles?.some((r) => r.toLowerCase() === "doctor");
    navigate(isDoctor ? "/doctor-appointments" : "/patient-appointments");
  };

  // 7. Listen for SignalR Event: CallTimeExpired (forced backend automatic completion)
  useEffect(() => {
    videoCallHubService.on("CallTimeExpired", handleCallTimeout);
    return () => {
      videoCallHubService.off("CallTimeExpired", handleCallTimeout);
    };
  }, [navigate]);

  // 8. Listen for SignalR Event: CallEndedByPeer
  useEffect(() => {
    const handleCallEndedByPeer = () => {
      cleanupMeetWindow();
      toast.info("The consultation was completed by the doctor.");
      const currentUser = authService.getUser() || userRef.current;
      const isDoctor =
        currentUser?.activeRole === "Doctor" ||
        currentUser?.roles?.some((r) => r.toLowerCase() === "doctor");
      navigate(isDoctor ? "/doctor-appointments" : "/patient-appointments");
    };

    videoCallHubService.on("CallEndedByPeer", handleCallEndedByPeer);
    return () => {
      videoCallHubService.off("CallEndedByPeer", handleCallEndedByPeer);
    };
  }, [navigate]);

  // 9. Listen for SignalR Event: UserLeft
  useEffect(() => {
    const handleUserLeft = (leftUserId: string) => {
      const localId = user?.id?.toLowerCase();
      if (localId && leftUserId.toLowerCase() !== localId) {
        toast.warn("The other participant left the lobby.");
      }
    };

    videoCallHubService.on("UserLeft", handleUserLeft);
    return () => {
      videoCallHubService.off("UserLeft", handleUserLeft);
    };
  }, [user?.id]);

  // 10. Listen for SignalR Chat Messages
  useEffect(() => {
    const handleReceiveMessage = (userId: string, message: string) => {
      if (userId === user?.id) return;

      const currentUser = userRef.current;
      const isLocalDoctor =
        currentUser?.activeRole === "Doctor" ||
        currentUser?.roles?.some((r) => r.toLowerCase() === "doctor");
      const senderName = isLocalDoctor ? "Patient" : "Doctor";

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          senderId: userId,
          senderName,
          text: message,
          timestamp: new Date(),
        },
      ]);
    };

    videoCallHubService.on("ReceiveMessage", handleReceiveMessage);
    return () => {
      videoCallHubService.off("ReceiveMessage", handleReceiveMessage);
    };
  }, [user?.id]);

  const getPersonalizedLink = (baseLink: string) => {
    const displayName = user?.fullName || "Participant";
    return `${baseLink}&name=${encodeURIComponent(displayName)}&video=0`;
  };

  // 11. Helper to open MiroTalk link and track window object
  const handleJoinMeeting = () => {
    if (callDurationSeconds >= 1800 || sessionDetails?.status === "Completed") {
      toast.error("The consultation time limit has expired. You cannot join this meeting.");
      return;
    }

    if (sessionDetails?.meetingLink && parsedSessionId) {
      const urlWithUserInfo = getPersonalizedLink(sessionDetails.meetingLink);
      
      // Notify backend that user is entering the MiroTalk video space
      videoCallHubService.joinVideoSpace(parsedSessionId).catch(console.error);
      
      meetWindowRef.current = window.open(urlWithUserInfo, "_blank");

      // Start polling to detect when the tab is closed
      if (meetWindowTimerRef.current) {
        clearInterval(meetWindowTimerRef.current);
      }

      meetWindowTimerRef.current = setInterval(() => {
        if (meetWindowRef.current?.closed) {
          clearInterval(meetWindowTimerRef.current);
          meetWindowTimerRef.current = null;
          meetWindowRef.current = null;
          
          // Notify backend that user left the MiroTalk video space
          videoCallHubService.leaveVideoSpace(parsedSessionId).catch(console.error);
        }
      }, 1000);
    } else {
      toast.error("Meeting link is not ready yet. Please retry.");
    }
  };

  function cleanupMeetWindow() {
    if (meetWindowTimerRef.current) {
      clearInterval(meetWindowTimerRef.current);
      meetWindowTimerRef.current = null;
    }
    if (meetWindowRef.current) {
      try {
        meetWindowRef.current.close();
      } catch (err) {
        console.warn("Could not programmatically close meeting window:", err);
      }
      meetWindowRef.current = null;
      if (parsedSessionId) {
        videoCallHubService.leaveVideoSpace(parsedSessionId).catch(console.error);
      }
    }
  }

  // 12. Manual completion / End call
  const handleEndCall = () => {
    if (parsedSessionId) {
      // Informs peer via SignalR
      videoCallHubService.endCall(parsedSessionId).catch(console.error);
      // Tells backend to complete and close
      api.post(`/VideoCall/leave-beacon/${parsedSessionId}/${videoCallHubService.getLeaveToken() || "none"}`)
        .catch(console.error);
    }
    cleanupMeetWindow();
    const currentUser = authService.getUser() || userRef.current;
    const isDoctor =
      currentUser?.activeRole === "Doctor" ||
      currentUser?.roles?.some((r) => r.toLowerCase() === "doctor");
    navigate(isDoctor ? "/doctor-appointments" : "/patient-appointments");
  };

  // 13. Send chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !parsedSessionId) return;

    try {
      await videoCallHubService.sendMessage(parsedSessionId, chatMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          senderId: user?.id || "local",
          senderName: "You",
          text: chatMessage,
          timestamp: new Date(),
        },
      ]);
      setChatMessage("");
    } catch (err) {
      console.error("Failed to send message", err);
      toast.error("Message could not be sent.");
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isChatOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen]);

  const formatTime = (seconds: number) => {
    const totalMins = 30;
    const elapsedMins = Math.floor(seconds / 60);
    const elapsedSecs = seconds % 60;
    const remainingMins = Math.max(0, totalMins - 1 - elapsedMins);
    const remainingSecs = Math.max(0, 60 - elapsedSecs);

    if (seconds >= 1800) {
      return "00:00";
    }

    const rMinStr = remainingMins.toString().padStart(2, "0");
    const rSecStr = (remainingSecs === 60 ? 0 : remainingSecs).toString().padStart(2, "0");
    return `${rMinStr}:${rSecStr}`;
  };

  const percentageRemaining = Math.max(0, 100 - (callDurationSeconds / 1800) * 100);
  const isDoctor =
    user?.activeRole === "Doctor" ||
    user?.roles?.some((r) => r.toLowerCase() === "doctor");

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 z-50 flex flex-col font-sans overflow-hidden text-white select-none">
      {/* Warning Banner */}
      {showWarning && (
        <div className="absolute top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 sm:px-6 py-3.5 flex items-center justify-center gap-3 shadow-2xl text-center">
            <FaExclamationTriangle className="text-xl animate-pulse shrink-0" />
            <span className="font-bold tracking-wide text-sm sm:text-base">
              Warning: 5 minutes remaining. This consultation room will close automatically.
            </span>
            <button
              onClick={() => setShowWarning(false)}
              className="absolute right-4 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Lobby Dashboard Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-y-auto">
          {/* Decorative blur rings */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>

          {/* Consultation Lobby Card */}
          <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col items-center relative z-10 transition-all hover:border-white/20">
            {/* Pulsing Status dot */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isMeetingStarted ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`}></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                {isMeetingStarted ? "Meeting Live" : "Waiting room"}
              </span>
            </div>

            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 shadow-inner border border-primary/30">
              <FaUserMd className="text-primary-light text-4xl" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Consultation Room
            </h2>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-widest font-mono">
              Session ID: {sessionId}
            </p>

            {/* Profile Info Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 mb-8">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                  <FaUserMd className="text-primary-light" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Doctor</p>
                  <p className="text-sm font-semibold truncate text-white">{sessionDetails?.doctorName || "Loading..."}</p>
                  <p className="text-xs text-white/60 truncate">{sessionDetails?.doctorSpecialty || "Specialist"}</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                  <FaUser className="text-teal-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Patient</p>
                  <p className="text-sm font-semibold truncate text-white">{sessionDetails?.patientName || "Loading..."}</p>
                  <p className="text-xs text-teal-400/80 font-medium">Verified Client</p>
                </div>
              </div>
            </div>

            {/* Connection CTA */}
            {sessionDetails?.meetingLink ? (
              <div className="w-full flex flex-col items-center gap-4 p-6 bg-primary/10 border border-primary/20 rounded-2xl">
                <p className="text-xs text-center text-primary-light/80 leading-relaxed font-medium">
                  We've successfully generated your video consultation room. Click below to launch the meeting. Keep this tab open in the background to track consultation time.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={handleJoinMeeting}
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light hover:brightness-110 active:scale-95 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg hover:shadow-primary/30"
                  >
                    Join Video Call <FaExternalLinkAlt className="text-xs" />
                  </button>
                </div>

                {isMobile && (
                  <div className="w-full mt-4 p-4 bg-white/5 border border-white/5 rounded-xl text-left text-xs text-white/70 space-y-2 leading-relaxed">
                    <p className="font-bold text-teal-400 flex items-center gap-2">
                      <FaExclamationTriangle className="text-sm shrink-0" />
                      Mobile Browser Support:
                    </p>
                    <p className="text-white/60">
                      MiroTalk P2P runs directly in your mobile browser without requiring any app installations. Simply click "Join Video Call" to begin, or copy the link to open in another browser.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-3 py-6">
                <div className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full animate-spin"></div>
                <p className="text-xs text-white/50">Generating secure meeting space...</p>
              </div>
            )}

            {/* Time Enforcer Display */}
            {isMeetingStarted && (
              <div className="w-full mt-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-white/80 font-medium">
                  <FaClock className="text-primary-light" /> Time Remaining
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold tracking-widest font-mono text-primary-light drop-shadow-[0_0_15px_rgba(30,144,255,0.4)] animate-pulse">
                  {formatTime(callDurationSeconds)}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      percentageRemaining > 20 ? "bg-primary" : "bg-red-500 animate-pulse"
                    }`}
                    style={{ width: `${percentageRemaining}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Drawer Sidebar */}
        {isChatOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white/10 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-40 animate-slide-in-right">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-white font-bold tracking-wide flex items-center gap-2">
                <FaCommentDots className="text-primary-light" /> In-Call Chat
              </h3>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                aria-label="Close chat"
                className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-white/40 mt-10 text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.senderId === user?.id ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-white/40 mb-1 ml-1">
                      {msg.senderName} •{" "}
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div
                      className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-md ${
                        msg.senderId === user?.id
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white/20 text-white rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 pb-28 sm:pb-4 bg-black/20 border-t border-white/10">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-white/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="bg-primary hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md shrink-0 cursor-pointer"
                >
                  <FaPaperPlane className="text-sm -ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Floating Control Dock */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 bg-black/40 backdrop-blur-xl border border-white/10 px-4 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-2xl max-w-[calc(100vw-1rem)]">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg relative shrink-0 ${
            isChatOpen
              ? "bg-primary/80 hover:bg-primary text-white border border-primary/50"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title="Toggle Chat"
        >
          <FaCommentDots className="text-base sm:text-xl" />
        </button>

        <div className="w-px h-6 sm:h-8 bg-white/20 mx-0.5 sm:mx-2 shrink-0"></div>

        {/* End Call / Close session Button */}
        <button
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-5 sm:px-6 py-3 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer border border-red-500 font-bold text-xs sm:text-sm shrink-0"
          title={isDoctor ? "Complete Consultation" : "Leave Consultation"}
        >
          <FaPhoneSlash className="text-sm sm:text-base" />
        </button>
      </div>
    </div>
  );
}
