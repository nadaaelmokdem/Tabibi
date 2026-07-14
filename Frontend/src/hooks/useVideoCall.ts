import { useState, useEffect, useRef, useCallback } from "react";
import Peer, { MediaConnection } from "peerjs";
import { useAuth } from "../context/AuthContext";
import { videoCallHubService } from "../services/videoCallHubService";

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
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);

  // Stream & Track Mutators
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  }, [localStream]);

  // Clean up function to be called on unmount or unload
  const cleanupCall = useCallback(() => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
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
    
    if (onCallEnded) {
      onCallEnded();
    }
  }, [localStream, sessionId, onCallEnded]);

  // Lifecycle Event Bindings
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Synchronous beacon to backend to inform them this user dropped
      if (sessionId && user?.id) {
        const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5009/api"}/videocall/leave`;
        const data = new Blob([JSON.stringify({ sessionId, userId: user.id })], {
          type: "application/json"
        });
        navigator.sendBeacon(url, data);
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupCall();
    };
  }, [sessionId, user?.id, cleanupCall]);

  const startCall = useCallback(async (targetPeerId: string) => {
    if (!peerRef.current || !localStream) return;
    setCallState("CONNECTING");
    
    const call = peerRef.current.call(targetPeerId, localStream);
    currentCallRef.current = call;

    call.on("stream", (remoteStream) => {
      setCallState("ACTIVE");
      if (onRemoteStream) {
        onRemoteStream(remoteStream);
      }
    });

    call.on("close", () => {
      setCallState("DISCONNECTED");
      if (onCallEnded) {
        onCallEnded();
      }
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
      setCallState("DISCONNECTED");
    });
  }, [localStream, onRemoteStream, onCallEnded]);

  const answerCall = useCallback((call: MediaConnection) => {
    if (!localStream) return;
    setCallState("CONNECTING");
    
    call.answer(localStream);
    currentCallRef.current = call;

    call.on("stream", (remoteStream) => {
      setCallState("ACTIVE");
      if (onRemoteStream) {
        onRemoteStream(remoteStream);
      }
    });

    call.on("close", () => {
      setCallState("DISCONNECTED");
      if (onCallEnded) {
        onCallEnded();
      }
    });

    call.on("error", (err) => {
      console.error("Answer call error:", err);
      setCallState("DISCONNECTED");
    });
  }, [localStream, onRemoteStream, onCallEnded]);

  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
      setIsVideoOff(!stream.getVideoTracks()[0]?.enabled);
      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      throw err;
    }
  }, []);

  const initializePeer = useCallback(() => {
    if (!user?.id || peerRef.current) return;

    setCallState("IDLE");
    // Static PeerJS Initialization using user.id
    const peer = new Peer(user.id, {
        host: "/", // Fallback to peerjs cloud or specify your peer server
        port: 443,
        secure: true,
        // config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
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
      // Let the consumer of the hook decide when to answer, or answer automatically if we have a stream
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
       // We could auto-call the newly joined user
       if (user?.id && joinedUserId !== user.id) {
           // wait a bit for them to initialize their peer
           setTimeout(() => {
               startCall(joinedUserId);
           }, 1000);
       }
    };

    videoCallHubService.on("UserJoined", handleUserJoined);

    const handlePeerReconnected = (reconnectedUserId: string) => {
      console.log("Peer reconnected:", reconnectedUserId);
      if (user?.id && reconnectedUserId !== user.id && callState !== "ACTIVE") {
           startCall(reconnectedUserId);
      }
    };

    videoCallHubService.on("PeerReconnected", handlePeerReconnected);

    return () => {
      videoCallHubService.off("UserJoined", handleUserJoined);
      videoCallHubService.off("PeerReconnected", handlePeerReconnected);
    };
  }, [user?.id, startCall, callState]);

  return {
    callState,
    localStream,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    startCall,
    initLocalStream,
    initializePeer,
    cleanupCall
  };
};
