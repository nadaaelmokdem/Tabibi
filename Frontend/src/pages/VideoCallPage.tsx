import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaCommentDots,
  FaTimes,
  FaPaperPlane,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useVideoCall } from "../hooks/useVideoCall";
import { videoCallHubService } from "../services/videoCallHubService";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export default function VideoCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const parsedSessionId = sessionId ? parseInt(sessionId, 10) : undefined;

  const {
    callState,
    localStream,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    initLocalStream,
    initializePeer,
    cleanupCall
  } = useVideoCall({
    sessionId: parsedSessionId,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
    onCallEnded: () => {
      navigate("/");
    }
  });

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (parsedSessionId && active) {
        try {
          const stream = await initLocalStream();
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
          initializePeer();
        } catch (err) {
          console.error("Failed to initialize video call:", err);
        }
      }
    };
    start();
    return () => {
      active = false;
      cleanupCall();
    };
  }, [parsedSessionId, initLocalStream, initializePeer, cleanupCall]);

  // Handle SignalR Chat Messages
  useEffect(() => {
    const handleReceiveMessage = (userId: string, message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          senderId: userId,
          senderName: userId === user?.id ? "You" : "Remote User", // Ideally backend sends senderName
          text: message,
          timestamp: new Date(),
        },
      ]);
      // Show chat if closed
      if (!isChatOpen) {
        // We could show a notification here, but auto-opening might be intrusive.
      }
    };

    videoCallHubService.on("ReceiveMessage", handleReceiveMessage);
    return () => {
      videoCallHubService.off("ReceiveMessage", handleReceiveMessage);
    };
  }, [user?.id, isChatOpen]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  // Timer logic for 30 minutes limit
  useEffect(() => {
    if (callState === "ACTIVE") {
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
            handleEndCall();
          }
          
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  const handleEndCall = () => {
    cleanupCall();
    navigate(-1);
  };

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
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col font-sans overflow-hidden">
      {/* Dynamic Warning Banner */}
      {showWarning && (
        <div className="absolute top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 flex items-center justify-center gap-3 shadow-xl">
            <FaExclamationTriangle className="text-xl animate-pulse" />
            <span className="font-bold tracking-wide">
              5 minutes remaining. This call will end automatically at 30 minutes.
            </span>
            <button onClick={() => setShowWarning(false)} className="absolute right-4 hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex relative">
        {/* Remote Video Container (Full Viewport) */}
        <div className={`flex-1 relative bg-black/50 transition-all duration-300 ${isChatOpen ? 'mr-80' : ''}`}>
          {callState !== "ACTIVE" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <div className="w-24 h-24 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6"></div>
              <p className="text-xl font-light tracking-widest uppercase">
                {callState === "CONNECTING" ? "Connecting..." : "Waiting for participant..."}
              </p>
            </div>
          )}
          
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-1000 ${callState === "ACTIVE" ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Call Status Overlay */}
          <div className="absolute top-6 left-6 flex items-center gap-4">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white shadow-lg flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${callState === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="font-medium tracking-wide text-sm">{callState}</span>
            </div>
            
            {callState === "ACTIVE" && (
              <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 shadow-lg font-mono text-sm">
                {formatTime(callDurationSeconds)}
              </div>
            )}
          </div>

          {/* Local Video PiP */}
          <div className="absolute bottom-28 right-8 w-48 sm:w-64 aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 hover:border-primary/50 transition-colors duration-300 group z-40">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <FaVideoSlash className="text-white/50 text-3xl" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              You
            </div>
          </div>
        </div>

        {/* Chat Drawer Sidebar */}
        <div 
          className={`absolute top-0 right-0 bottom-0 w-80 bg-white/10 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col z-40 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="text-white font-bold tracking-wide flex items-center gap-2">
              <FaCommentDots className="text-primary-light" /> In-Call Chat
            </h3>
            <button 
              onClick={() => setIsChatOpen(false)}
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
                <div key={msg.id} className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-white/40 mb-1 ml-1">{msg.senderName} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-md ${
                    msg.senderId === user?.id 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white/20 text-white rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/20 border-t border-white/10">
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
      </div>

      {/* Floating Control Dock */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full shadow-2xl">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isMuted 
              ? 'bg-red-500/90 hover:bg-red-600 text-white border border-red-400' 
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <FaMicrophoneSlash className="text-xl" /> : <FaMicrophone className="text-xl" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isVideoOff 
              ? 'bg-red-500/90 hover:bg-red-600 text-white border border-red-400' 
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
          }`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <FaVideoSlash className="text-xl" /> : <FaVideo className="text-xl" />}
        </button>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg relative ${
            isChatOpen
              ? 'bg-primary/80 hover:bg-primary text-white border border-primary/50'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
          }`}
          title="Toggle Chat"
        >
          <FaCommentDots className="text-xl" />
        </button>

        <div className="w-px h-8 bg-white/20 mx-2"></div>

        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all cursor-pointer border border-red-500"
          title="End Call"
        >
          <FaPhoneSlash className="text-2xl" />
        </button>
      </div>
    </div>
  );
}
