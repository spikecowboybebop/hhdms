"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { loadSession } from "../../lib/auth";

interface TeleconsultModalProps {
  open: boolean;
  sessionId: string;
  roomName: string;
  referralId: string;
  specialistId: string;
  patientName: string;
  onClose: () => void;
}

type ConnectionState = "joining" | "waiting" | "connected" | "ended";

// Module-level singletons to survive React Strict Mode double-mount.
// Strict Mode calls effect → cleanup → effect. Both mounts run setupCall
// concurrently, so a coordination promise ensures only ONE mount performs
// the full async initialization (getUserMedia, PC, socket, handlers).
let globalSocket: Socket | null = null;
let globalPC: RTCPeerConnection | null = null;
let globalStream: MediaStream | null = null;
let globalRemoteStream: MediaStream | null = null;
let globalTimer: ReturnType<typeof setInterval> | null = null;
let globalSetupPromise: Promise<void> | null = null;
let globalHandlersRegistered = false;

function destroySingletons(sid: string) {
  if (globalSocket?.connected) {
    globalSocket.emit("teleconsult:leave-room", { sessionId: sid });
  }
  globalSocket?.disconnect();
  globalSocket = null;
  globalPC?.close();
  globalPC = null;
  if (globalStream) {
    globalStream.getTracks().forEach((t) => t.stop());
    globalStream = null;
  }
  if (globalRemoteStream) {
    globalRemoteStream.getTracks().forEach((t) => t.stop());
    globalRemoteStream = null;
  }
  if (globalTimer) {
    clearInterval(globalTimer);
    globalTimer = null;
  }
  globalSetupPromise = null;
  globalHandlersRegistered = false;
}

export function TeleconsultModal({
  open,
  sessionId,
  roomName,
  referralId,
  specialistId,
  patientName,
  onClose,
}: TeleconsultModalProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("joining");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    if (globalTimer) {
      clearInterval(globalTimer);
      globalTimer = null;
      timerRef.current = null;
    }
  }, []);

  const setupCall = useCallback(async () => {
    // ── Guard: already fully initialized ──────────────────────────
    if (globalPC) {
      socketRef.current = globalSocket;
      pcRef.current = globalPC;
      localStreamRef.current = globalStream;
      if (localVideoRef.current && globalStream) {
        localVideoRef.current.srcObject = globalStream;
      }
      if (remoteVideoRef.current && globalRemoteStream) {
        remoteVideoRef.current.srcObject = globalRemoteStream;
      }
      return;
    }

    // ── Guard: mount #1 is still in async setup — wait for it ──
    if (globalSetupPromise) {
      await globalSetupPromise;
      socketRef.current = globalSocket;
      pcRef.current = globalPC;
      localStreamRef.current = globalStream;
      if (localVideoRef.current && globalStream) {
        localVideoRef.current.srcObject = globalStream;
      }
      if (remoteVideoRef.current && globalRemoteStream) {
        remoteVideoRef.current.srcObject = globalRemoteStream;
      }
      return;
    }

    // ── Mount #1: full async initialization ──────────────────────
    globalSetupPromise = _doFullSetup(sessionId);
    await globalSetupPromise;
    globalSetupPromise = null;

    socketRef.current = globalSocket;
    pcRef.current = globalPC;
    localStreamRef.current = globalStream;
    if (localVideoRef.current && globalStream) {
      localVideoRef.current.srcObject = globalStream;
    }
    if (remoteVideoRef.current && globalRemoteStream) {
      remoteVideoRef.current.srcObject = globalRemoteStream;
    }
  }, [sessionId]);

  async function _doFullSetup(sid: string) {
    const session = loadSession();
    if (!session) {
      setErrorMessage("You must be logged in to start a teleconsultation.");
      return;
    }

    setErrorMessage(null);
    setConnectionState("joining");
    setIsAudioOnly(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socketUrl = apiUrl.replace("/api", "");

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          setIsAudioOnly(true);
          setCameraOn(false);
        } catch {
          setErrorMessage(
            "No microphone found. Please connect a microphone and try again."
          );
          return;
        }
      } else if (err instanceof DOMException && err.name === "NotAllowedError") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          setIsAudioOnly(true);
          setCameraOn(false);
        } catch {
          setErrorMessage(
            "Microphone access was denied. Please allow access in your browser settings."
          );
          return;
        }
      } else {
        throw err;
      }
    }
    if (!stream) return;
    globalStream = stream;
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      globalPC = pc;
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const remoteStream = new MediaStream();
      globalRemoteStream = remoteStream;
      pc.addEventListener("track", (event) => {
        const track = event.track;
        if (!track) return;
        console.log(`[Teleconsult] Remote track received: kind=${track.kind}, id=${track.id}`);
        remoteStream.addTrack(track);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit("teleconsult:ice-candidate", {
            sessionId: sid,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected") {
          disconnectTimer = setTimeout(() => {
            if (pc.connectionState === "disconnected") {
              setConnectionState("ended");
              destroySingletons(sid);
            }
          }, 10000);
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
          }
          setConnectionState("ended");
          destroySingletons(sid);
        } else if (pc.connectionState === "connected") {
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimer = null;
          }
        }
      };

      const socket = io(`${socketUrl}/teleconsult`, {
        transports: ["websocket", "polling"],
      });
      globalSocket = socket;
      socketRef.current = socket;

      if (globalHandlersRegistered) return;
      globalHandlersRegistered = true;

      socket.on("connect", () => {
        console.log("[Teleconsult] Socket connected");
        socket.emit("teleconsult:join-room", { sessionId: sid });
      });

      socket.on("teleconsult:room-joined", ({ peerCount }) => {
        console.log(`[Teleconsult] Joined room, peers: ${peerCount}`);
        setConnectionState(peerCount >= 2 ? "connected" : "waiting");
      });

      socket.on("teleconsult:peer-joined", async () => {
        console.log("[Teleconsult] Peer joined, creating offer");
        setConnectionState("connected");
        setCallDuration(0);
        globalTimer = setInterval(() => {
          setCallDuration((p) => p + 1);
        }, 1000);
        timerRef.current = globalTimer;

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("teleconsult:offer", {
            sessionId: sid,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error("[Teleconsult] Failed to create offer:", err);
        }
      });

      const flushIceCandidates = async () => {
        const pending = pendingIceCandidatesRef.current;
        pendingIceCandidatesRef.current = [];
        for (const c of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (err) {
            console.error(
              "[Teleconsult] Failed to add pending ICE candidate:",
              err,
            );
          }
        }
      };

      socket.on("teleconsult:offer-received", async ({ sdp }) => {
        console.log("[Teleconsult] Offer received");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIceCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("teleconsult:answer", {
            sessionId: sid,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error("[Teleconsult] Failed to handle offer:", err);
        }
      });

      socket.on("teleconsult:answer-received", async ({ sdp }) => {
        console.log("[Teleconsult] Answer received");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIceCandidates();
        } catch (err) {
          console.error("[Teleconsult] Failed to handle answer:", err);
        }
      });

      socket.on("teleconsult:ice-candidate-received", async ({ candidate }) => {
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[Teleconsult] Failed to add ICE candidate:", err);
        }
      });

      socket.on("teleconsult:peer-left", () => {
        console.log("[Teleconsult] Peer left");
        setConnectionState("ended");
        destroySingletons(sid);
      });

      socket.on("teleconsult:room-error", ({ message }) => {
        console.error("[Teleconsult] Room error:", message);
      });
    } catch (err) {
      console.error("[Teleconsult] Setup failed:", err);
      if (err instanceof DOMException) {
        if (err.name === "NotReadableError") {
          setErrorMessage(
            "Camera or microphone is in use by another app. Please close it and try again.",
          );
        } else if (err.name === "OverconstrainedError") {
          setErrorMessage(
            "No camera or microphone matches the requested constraints. Try a different device.",
          );
        } else {
          setErrorMessage(`Unable to access media devices: ${err.message}`);
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    setupCall();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  useEffect(() => {
    if (connectionState !== "ended" || errorMessage) return;
    const t = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(t);
  }, [connectionState, errorMessage, onClose]);

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const handleHangup = () => {
    destroySingletons(sessionId);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/teleconsult/sessions/${sessionId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      },
    ).catch(() => {});
    setConnectionState("ended");
    onClose();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] m-4 rounded-2xl overflow-hidden bg-[#0A2540] flex flex-col">
        {/* Remote Video (full area) */}
        <div className="relative flex-1 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          {connectionState === "waiting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white mb-4" />
              <p className="text-lg font-semibold">Waiting for {patientName} to join...</p>
            </div>
          )}

          {connectionState === "joining" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white mb-4" />
              <p className="text-lg font-semibold">Connecting...</p>
            </div>
          )}

          {connectionState === "ended" && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <p className="text-lg font-semibold">Call Ended</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-center text-sm font-medium leading-relaxed">{errorMessage}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    retryCountRef.current += 1;
                    setupCall();
                  }}
                  className="rounded-lg bg-white/20 px-6 py-2 text-sm font-semibold hover:bg-white/30 transition"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-red-600/60 px-6 py-2 text-sm font-semibold hover:bg-red-600/80 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Local Video Preview (PIP) — hidden in audio-only mode */}
          {!isAudioOnly && (
            <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Connection Status + Timer */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 text-white text-xs font-medium">
            {connectionState === "connected" && (
              <>
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span>Live — {formatDuration(callDuration)}</span>
              </>
            )}
            {connectionState !== "connected" && connectionState !== "ended" && (
              <span>{connectionState === "waiting" ? "Waiting for patient" : "Connecting..."}</span>
            )}
          </div>

          {/* Patient Name + Audio-Only Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="rounded-full bg-black/50 px-3 py-1 text-white text-xs font-medium">
              {patientName}
            </div>
            {isAudioOnly && (
              <div className="rounded-full bg-amber-500/80 px-3 py-1 text-white text-xs font-semibold">
                Audio Only
              </div>
            )}
          </div>
        </div>

        {/* Control Bar */}
        {connectionState !== "ended" && (
          <div className="flex items-center justify-center gap-4 px-6 py-4 bg-[#0A2540] border-t border-white/10">
            {!isAudioOnly && (
              <button
                onClick={toggleCamera}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  cameraOn
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-red-500/80 text-white"
                }`}
                title={cameraOn ? "Turn off camera" : "Turn on camera"}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {cameraOn ? (
                    <>
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </>
                  ) : (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </>
                  )}
                </svg>
              </button>
            )}

            <button
              onClick={toggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                micOn
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-red-500/80 text-white"
              }`}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {micOn ? (
                  <>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </>
                ) : (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                    <path d="M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M19 10v2a7 7 0 0 1-6.17 6.91" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </>
                )}
              </svg>
            </button>

            <button
              onClick={handleHangup}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-lg"
              title="End call"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
