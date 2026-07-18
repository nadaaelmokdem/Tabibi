import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import { useAuth } from "../context/AuthContext";
import { videoCallHubService } from "../services/videoCallHubService";
import { toast } from "react-toastify";

export type CallState = "IDLE" | "CONNECTING" | "ACTIVE" | "RECONNECTING" | "DISCONNECTED";

const createSilentAudioTrack = (): MediaStreamTrack | null => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    if (track) {
      track.enabled = false;
      return track;
    }
    return null;
  } catch (e) {
    console.error("Failed to create silent audio track:", e);
    return null;
  }
};

const createBlankVideoTrack = (width = 640, height = 480): MediaStreamTrack | null => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);
    }
    const stream = (canvas as any).captureStream 
      ? (canvas as any).captureStream(30) 
      : (canvas as any).mozCaptureStream 
        ? (canvas as any).mozCaptureStream(30) 
        : null;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.enabled = false;
        return track;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to create blank video track:", e);
    return null;
  }
};

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
      const newMuteState = !stream.getAudioTracks()[0]?.enabled;
      setIsMuted(newMuteState);
      if (sessionId) {
        videoCallHubService.toggleAudioState(sessionId, newMuteState).catch(console.error);
      }
    } else {
      setIsMuted(true);
      toast.error("No microphone device available.");
    }
  }, [sessionId]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream && stream.getVideoTracks().length > 0) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newVideoState = !stream.getVideoTracks()[0]?.enabled;
      setIsVideoOff(newVideoState);
      if (sessionId) {
        videoCallHubService.toggleVideoState(sessionId, newVideoState).catch(console.error);
      }
    } else {
      setIsVideoOff(true);
      toast.error("No camera device available.");
    }
  }, [sessionId]);

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
      const leaveToken = videoCallHubService.getLeaveToken();
      if (sessionId && leaveToken) {
        const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5009/api"}/VideoCall/leave-beacon/${sessionId}/${leaveToken}`;
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

    let audioTrack: MediaStreamTrack | null = null;
    let videoTrack: MediaStreamTrack | null = null;
    let hasRealAudio = false;
    let hasRealVideo = false;

    // 1. Try to get both video and audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      audioTrack = stream.getAudioTracks()[0] || null;
      videoTrack = stream.getVideoTracks()[0] || null;
      hasRealAudio = !!audioTrack;
      hasRealVideo = !!videoTrack;
    } catch (err) {
      console.warn("Failed to get both video and audio, attempting fallback combinations...", err);
      
      // Try audio-only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        audioTrack = audioStream.getAudioTracks()[0] || null;
        hasRealAudio = !!audioTrack;
        toast.warn("Camera could not be accessed. Audio-only mode enabled.");
      } catch (audioErr) {
        console.warn("Microphone not accessible:", audioErr);
      }

      // Try video-only (if audio failed or wasn't fetched yet)
      if (!videoTrack) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          videoTrack = videoStream.getVideoTracks()[0] || null;
          hasRealVideo = !!videoTrack;
          toast.warn("Microphone could not be accessed. Video-only mode enabled.");
        } catch (videoErr) {
          console.warn("Camera not accessible:", videoErr);
        }
      }
    }

    // 2. Generate fallback tracks if hardware/permission is absent
    if (!audioTrack) {
      console.log("No real microphone accessible. Creating silent audio track fallback.");
      const mockAudioTrack = createSilentAudioTrack();
      if (mockAudioTrack) {
        audioTrack = mockAudioTrack;
      }
    }

    if (!videoTrack) {
      console.log("No real camera accessible. Creating blank video track fallback.");
      const mockVideoTrack = createBlankVideoTrack();
      if (mockVideoTrack) {
        videoTrack = mockVideoTrack;
      }
    }

    const tracks: MediaStreamTrack[] = [];
    if (audioTrack) tracks.push(audioTrack);
    if (videoTrack) tracks.push(videoTrack);

    const stream = new MediaStream(tracks);
    localStreamRef.current = stream;
    setLocalStream(stream);

    // Setup initial state: camera is off by default, microphone is muted if it's mock
    if (videoTrack) {
      videoTrack.enabled = false; // Camera starts off
      setIsVideoOff(true);
    } else {
      setIsVideoOff(true);
    }

    if (audioTrack) {
      // If it's a real microphone, unmute it; if mock, mute it.
      audioTrack.enabled = hasRealAudio;
      setIsMuted(!hasRealAudio);
    } else {
      setIsMuted(true);
    }

    if (!hasRealAudio || !hasRealVideo) {
      toast.info("Connected to call. Note: Microphone or camera access was restricted or not found.");
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
        videoCallHubService.joinCall(sessionId).catch((err) => {
          console.error("Failed to join video call session:", err);
          toast.error("Failed to join the call. Please try refreshing the page.");
          setCallState("DISCONNECTED");
        });
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
      clearConnectionTimeout();
      setCallState("DISCONNECTED");
      setPeerJoined(false);
      toast.error("Video call connection failed. Please try rejoining.");
    });

  }, [user?.id, sessionId, answerCall, clearConnectionTimeout]);

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
