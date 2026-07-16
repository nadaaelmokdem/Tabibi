import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import { useAuth } from "../context/AuthContext";
import { videoCallHubService } from "../services/videoCallHubService";
import { toast } from "react-toastify";

export type CallState = "IDLE" | "CONNECTING" | "ACTIVE" | "RECONNECTING" | "DISCONNECTED";

interface UseVideoCallProps {
  sessionId?: number;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
}

export const useVideoCall = ({ sessionId, onRemoteStream, onCallEnded }: UseVideoCallProps) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>("IDLE");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [peerJoined, setPeerJoined] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionTimeoutRef = useRef<any>(null);

  const onRemoteStreamRef = useRef(onRemoteStream);
  const onCallEndedRef = useRef(onCallEnded);
  const callStateRef = useRef<CallState>(callState);

  useEffect(() => {
    onRemoteStreamRef.current = onRemoteStream;
    onCallEndedRef.current = onCallEnded;
  }, [onRemoteStream, onCallEnded]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const startConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    connectionTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "CONNECTING") {
        console.warn("Connection attempt timed out.");
        if (currentCallRef.current) {
          currentCallRef.current.close();
          currentCallRef.current = null;
        }
        setCallState("IDLE");
        setPeerJoined(false);
        toast.error("Connection timed out. Waiting for participant to retry...");
      }
    }, 15000); // 15 seconds timeout
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // Stream & Track Mutators
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream && stream.getAudioTracks().length > 0) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
    } else {
      setIsMuted(true);
      toast.error("No microphone device available.");
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream && stream.getVideoTracks().length > 0) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!stream.getVideoTracks()[0]?.enabled);
    } else {
      setIsVideoOff(true);
      toast.error("No camera device available.");
    }
  }, []);

  // Clean up function to be called on unmount or unload
  const cleanupCall = useCallback(() => {
    clearConnectionTimeout();

    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (sessionId) {
      videoCallHubService.leaveCall(sessionId).catch(console.error);
    }
    setCallState("DISCONNECTED");
    setPeerJoined(false);
  }, [sessionId, clearConnectionTimeout]);

  // Safe isolated unmount hook using a ref to prevent accidental cleanup on dependency changes
  const cleanupCallRef = useRef(cleanupCall);
  useEffect(() => {
    cleanupCallRef.current = cleanupCall;
  }, [cleanupCall]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && user?.id) {
        const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5009/api"}/VideoCall/leave-beacon/${sessionId}/${user.id}`;
        navigator.sendBeacon(url);
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupCallRef.current();
    };
  }, [sessionId, user?.id]);

  const startCall = useCallback(async (targetPeerId: string) => {
    const stream = localStreamRef.current;
    if (!peerRef.current || !stream) return;

    if (currentCallRef.current) {
      currentCallRef.current.close();
    }

    setCallState("CONNECTING");
    setPeerJoined(true);
    startConnectionTimeout();
    
    const call = peerRef.current.call(targetPeerId, stream);
    currentCallRef.current = call;

    call.on("stream", (remoteStream) => {
      clearConnectionTimeout();
      setCallState("ACTIVE");
      if (onRemoteStreamRef.current) {
        onRemoteStreamRef.current(remoteStream);
      }
    });

    call.on("close", () => {
      clearConnectionTimeout();
      setCallState("IDLE");
      setPeerJoined(false);
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
      clearConnectionTimeout();
      setCallState("IDLE");
      setPeerJoined(false);
    });
  }, [startConnectionTimeout, clearConnectionTimeout]);

  const answerCall = useCallback((call: MediaConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (currentCallRef.current) {
      currentCallRef.current.close();
    }

    setCallState("CONNECTING");
    setPeerJoined(true);
    startConnectionTimeout();
    
    call.answer(stream);
    currentCallRef.current = call;

    call.on("stream", (remoteStream) => {
      clearConnectionTimeout();
      setCallState("ACTIVE");
      if (onRemoteStreamRef.current) {
        onRemoteStreamRef.current(remoteStream);
      }
    });

    call.on("close", () => {
      clearConnectionTimeout();
      setCallState("IDLE");
      setPeerJoined(false);
    });

    call.on("error", (err) => {
      console.error("Answer call error:", err);
      clearConnectionTimeout();
      setCallState("IDLE");
      setPeerJoined(false);
    });
  }, [startConnectionTimeout, clearConnectionTimeout]);

  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    let stream: MediaStream | null = null;
    let hasVideo = true;
    let hasAudio = true;

    try {
      // 1. Try to get both video and audio
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.warn("Failed to get both video and audio, trying fallback...", err);
      
      // 2. Fallback to audio-only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        hasVideo = false;
        toast.warn("Camera could not be accessed. Audio-only mode enabled.");
      } catch (audioErr) {
        console.warn("Failed to get audio stream, trying video-only...", audioErr);
        
        // 3. Fallback to video-only
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          hasAudio = false;
          toast.warn("Microphone could not be accessed. Video-only mode enabled.");
        } catch (videoErr) {
          console.error("No camera or mic devices found or accessible. Creating empty stream.", videoErr);
          toast.error("Could not access camera or microphone. Please check permissions.");
          
          // 4. Return an empty MediaStream so WebRTC signaling does not crash
          stream = new MediaStream();
          hasVideo = false;
          hasAudio = false;
        }
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    // Camera off by default, mic on by default (if available)
    if (hasVideo) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsVideoOff(true);
    } else {
      setIsVideoOff(true);
    }

    if (hasAudio) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }

    return stream;
  }, []);

  const initializePeer = useCallback(() => {
    if (!user?.id || peerRef.current) return;

    setCallState("IDLE");
    const peer = new Peer(user.id.toLowerCase(), {
        debug: 2,
        config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }, { 'urls': 'stun:stun2.l.google.com:19302' }] }
    });

    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("PeerJS initialized with ID:", id);
      if (sessionId) {
        videoCallHubService.joinCall(sessionId).catch(console.error);
      }
    });

    // Handle peer.on('call') automatically
    peer.on("call", (call) => {
      console.log("Incoming call from:", call.peer);
      answerCall(call);
    });

    peer.on("disconnected", () => {
      console.warn("Peer disconnected. Attempting to reconnect...");
      setCallState("RECONNECTING");
      peer.reconnect();
    });

    peer.on("close", () => {
      setCallState("DISCONNECTED");
    });

    peer.on("error", (err) => {
      console.error("PeerJS error:", err);
    });
    
  }, [user?.id, sessionId, answerCall]);

  // Setup signalR event listeners
  useEffect(() => {
    const handleUserJoined = (joinedUserId: string) => {
       console.log("User joined the call session via Hub:", joinedUserId);
       const localId = user?.id?.toLowerCase();
       const remoteId = joinedUserId.toLowerCase();
       if (localId && remoteId !== localId) {
           setPeerJoined(true);
           toast.info("Participant joined the call");
           // Lexicographical comparison to decide who calls who (avoid collisions)
           const shouldInitiate = localId.localeCompare(remoteId) < 0;
           if (shouldInitiate) {
               console.log("Initiating call to joined user:", remoteId);
               setTimeout(() => {
                   startCall(remoteId);
               }, 1000);
           } else {
               console.log("Waiting for joined user to call us:", remoteId);
           }
       }
    };

    videoCallHubService.on("UserJoined", handleUserJoined);

    const handleRoomPresence = (userIds: string[]) => {
       console.log("Existing users in the room:", userIds);
       const localId = user?.id?.toLowerCase();
       if (localId) {
           const otherUsers = userIds.map(id => id.toLowerCase()).filter(id => id !== localId);
           if (otherUsers.length > 0) {
               setPeerJoined(true);
               const targetUserId = otherUsers[0];
               // Lexicographical comparison to decide who calls who (avoid collisions)
               const shouldInitiate = localId.localeCompare(targetUserId) < 0;
               if (shouldInitiate) {
                   console.log("Initiating call to existing user:", targetUserId);
                   setTimeout(() => {
                       startCall(targetUserId);
                   }, 1000);
               } else {
                   console.log("Waiting for existing user to call us:", targetUserId);
               }
           }
       }
    };

    videoCallHubService.on("RoomPresence", handleRoomPresence);

    const handleUserLeft = (leftUserId: string) => {
       console.log("User left the call session via Hub:", leftUserId);
       const localId = user?.id?.toLowerCase();
       const remoteId = leftUserId.toLowerCase();
       if (localId && remoteId !== localId) {
           setPeerJoined(false);
           toast.warn("Participant left the call");
           if (currentCallRef.current) {
               currentCallRef.current.close();
               currentCallRef.current = null;
           }
           setCallState("IDLE");
       }
    };

    videoCallHubService.on("UserLeft", handleUserLeft);

    const handlePeerReconnected = (reconnectedUserId: string) => {
      console.log("Peer reconnected:", reconnectedUserId);
      const localId = user?.id?.toLowerCase();
      const remoteId = reconnectedUserId.toLowerCase();
      if (localId && remoteId !== localId) {
           setPeerJoined(true);
           toast.info("Participant reconnected");
           const shouldInitiate = localId.localeCompare(remoteId) < 0;
           if (shouldInitiate) {
               startCall(remoteId);
           }
      }
    };

    videoCallHubService.on("PeerReconnected", handlePeerReconnected);

    const handleUnauthorized = (message: any) => {
      console.error("Unauthorized to join video call:", message);
      const errorMsg = typeof message === "string" ? message : (message?.Message || "Unauthorized to join video call.");
      toast.error(errorMsg);
      if (onCallEndedRef.current) {
        onCallEndedRef.current();
      }
    };

    videoCallHubService.on("Unauthorized", handleUnauthorized);

    return () => {
      videoCallHubService.off("UserJoined", handleUserJoined);
      videoCallHubService.off("RoomPresence", handleRoomPresence);
      videoCallHubService.off("UserLeft", handleUserLeft);
      videoCallHubService.off("PeerReconnected", handlePeerReconnected);
      videoCallHubService.off("Unauthorized", handleUnauthorized);
    };
  }, [user?.id, startCall]);

  return {
    callState,
    localStream,
    isMuted,
    isVideoOff,
    peerJoined,
    toggleMute,
    toggleVideo,
    startCall,
    initLocalStream,
    initializePeer,
    cleanupCall
  };
};
