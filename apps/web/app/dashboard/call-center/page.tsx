"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";
import {
  SectionCard,
  StatCard,
} from "@/components/dashboard/dashboard-cards";
import {
  clearSession,
  loadSession,
  dashboardPathForRole,
  type StoredSession,
} from "@/lib/auth";
import PatientRegistrationModal from "@/components/dashboard/patient-registration-modal";

interface CallTicket {
  id: string;
  caller: string;
  phone: string;
  district: string;
  urgency: "EMERGENCY" | "URGENT" | "ROUTINE";
  channel: "PHONE" | "WHATSAPP" | "WEB";
  receivedAt: string;
  status: "QUEUED" | "ROUTED" | "IN_PROGRESS" | "RESOLVED";
}

const mockTickets: CallTicket[] = [
  {
    id: "TKT-2026-00421",
    caller: "Rahima Begum",
    phone: "+880 1711 234 567",
    district: "Dhaka — Mohammadpur",
    urgency: "EMERGENCY",
    channel: "PHONE",
    receivedAt: "09:42",
    status: "ROUTED",
  },
  {
    id: "TKT-2026-00422",
    caller: "Karim Hossain",
    phone: "+880 1912 887 412",
    district: "Chattogram — Halishahar",
    urgency: "URGENT",
    channel: "PHONE",
    receivedAt: "09:51",
    status: "IN_PROGRESS",
  },
  {
    id: "TKT-2026-00423",
    caller: "Sumi Akter",
    phone: "+880 1611 555 019",
    district: "Sylhet — Zindabazar",
    urgency: "ROUTINE",
    channel: "WHATSAPP",
    receivedAt: "10:03",
    status: "QUEUED",
  },
];

const navItems: DashboardNavItem[] = [
  {
    label: "Live Queue",
    href: "/dashboard/call-center",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
];

const urgencyStyles: Record<CallTicket["urgency"], string> = {
  EMERGENCY: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20",
  URGENT: "bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20",
  ROUTINE: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
};

const statusStyles: Record<CallTicket["status"], string> = {
  QUEUED: "bg-slate-100 text-[#2D3A4A] border-slate-200",
  ROUTED: "bg-[#00D4B2]/10 text-[#00D4B2] border-[#00D4B2]/20",
  IN_PROGRESS: "bg-[#0A2540] text-white border-[#0A2540]",
  RESOLVED: "bg-[#2D3A4A]/10 text-[#2D3A4A] border-[#2D3A4A]/20",
};

export default function CallCenterDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"ALL" | CallTicket["urgency"]>("ALL");

  // WebRTC State Containers
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [callConnected, setCallConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    patientEmail: string;
    patientSocketId: string;
    sdpOffer: any;
  } | null>(null);
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("Mobile User");
  const [callerEmail, setCallerEmail] = useState<string>("");
  const [showRegModal, setShowRegModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callSessionKey, setCallSessionKey] = useState(0);
  const callStartTimeRef = useRef<number | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const patientSocketIdRef = useRef<string | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  
  // Track dynamic current call state across async triggers inside a clean React ref
  const currentIncomingCallRef = useRef<any>(null);
  useEffect(() => {
    currentIncomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Play ringtone when a call comes in, stop when dismissed
  useEffect(() => {
    if (incomingCall) {
      const audio = new Audio('/classic-5916.mp3');
      audio.loop = true;
      audio.volume = 0.4;
      audio.play().catch(() => {/* autoplay blocked — user will interact */});
      ringtoneRef.current = audio;
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [incomingCall]);

  // Open registration modal when call becomes active; close when it ends
  useEffect(() => {
    if (callConnected) {
      setCallSessionKey((k) => k + 1);
      setShowRegModal(true);
    } else {
      setShowRegModal(false);
    }
  }, [callConnected]);

  // Call duration timer
  useEffect(() => {
    if (callConnected) {
      callStartTimeRef.current = Date.now();
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      callStartTimeRef.current = null;
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callConnected]);

  // Shared cleanup used by hangup, peer-disconnect, and connection-failure paths.
  // Reads socket from a ref to avoid stale closures in async event handlers.
  const cleanupCall = useCallback((emitHangup: boolean = false) => {
    const socketId = patientSocketIdRef.current;

    if (emitHangup && socketId && socketRef.current) {
      socketRef.current.emit("end-call", { targetSocketId: socketId });
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }

    const audioNode = document.getElementById("patientAudioDriver") as HTMLAudioElement;
    if (audioNode) {
      audioNode.pause();
      audioNode.srcObject = null;
    }

    patientSocketIdRef.current = null;
    setIncomingCall(null);
    setCallConnected(false);
    setPatientPhone("");
    setCallerName("Mobile User");
    setCallerEmail("");
  }, []);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setHydrated(true);

    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.user.role !== "CALL_CENTER_AGENT") {
      router.replace(dashboardPathForRole(s.user.role));
      return;
    }

    const socketClient = io("http://localhost:3001");

    socketClient.on("connect", () => {
      console.log("⚡ Agent Dashboard successfully connected to NestJS signaling gateway!");
    });

    socketClient.on("call-center-dial", (data) => {
      if (!data) return;
      console.log("📞 Raw Incoming WebRTC payload arriving on browser via [call-center-dial]:", data);
      
      const resolvedSocketId = data.patientSocketId || data.socketId || data.from;
      if (!resolvedSocketId) {
        console.error("⚠️ CRITICAL: Call packet received but missing identifier tracking properties!", data);
      }

      const email: string = String(data.patientEmail || "Unknown Patient");
      const [localPart1] = email.split("@");
      const name: string = (localPart1 || "").split(".").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
      patientSocketIdRef.current = resolvedSocketId;
      setPatientPhone(data.patientPhone || data.phone || "");
      setCallerName(name);
      setCallerEmail(email);
      setIncomingCall({
        patientEmail: email,
        patientSocketId: resolvedSocketId,
        sdpOffer: data.sdpOffer
      });
    });

    socketClient.on("agent-incoming-call", (data) => {
      if (!data) return;
      console.log("📞 Alternate event channel caught incoming request [agent-incoming-call]:", data);
      const resolvedSocketId = data.patientSocketId || data.socketId || data.from;
      const email: string = String(data.patientEmail || "Unknown Patient");
      const [localPart2] = email.split("@");
      const name: string = (localPart2 || "").split(".").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
      patientSocketIdRef.current = resolvedSocketId;
      setPatientPhone(data.patientPhone || data.phone || "");
      setCallerName(name);
      setCallerEmail(email);
      setIncomingCall({
        patientEmail: email,
        patientSocketId: resolvedSocketId,
        sdpOffer: data.sdpOffer
      });
    });

    // When the remote peer hangs up or disconnects, clean up locally
    socketClient.on("call-ended", (data: { reason: string }) => {
      console.log(`📞 [CALL-ENDED] Remote peer ended the call. Reason: ${data.reason}`);
      cleanupCall(false);
    });

    // Robust ICE payload parser matching the nested structure from Android
    const handleIncomingIce = async (data: any) => {
      if (peerConnection.current) {
        try {
          const rawCandidate = data?.candidate?.candidate || data?.candidate;
          const sdpMid = data?.candidate?.sdpMid ?? data?.sdpMid;
          const sdpMLineIndex = data?.candidate?.sdpMLineIndex ?? data?.sdpMLineIndex;

          if (rawCandidate) {
            console.log("🛰️ Appending remote framework ICE candidate pathway...");
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate({
                candidate: rawCandidate,
                sdpMid: sdpMid,
                sdpMLineIndex: sdpMLineIndex,
              })
            );
          }
        } catch (e) {
          console.error("Error setting incoming candidate:", e);
        }
      }
    };

    // Subscribing to all possible signaling server event name variants
    socketClient.on("remote-ice-candidate", handleIncomingIce);
    socketClient.on("ice-candidate", handleIncomingIce);
    socketClient.on("relay-ice-candidate", handleIncomingIce);

    socketRef.current = socketClient;
    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // ACTION: Click "Pick Up / Answer" on Modal Trigger
  const handleAnswerCall = async () => {
    if (!incomingCall || !socket) return;

    try {
      // 1. Gain local authorization to capture the browser microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;

      // 2. Setup standard Google RTC Peer connection architecture configuration
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Auto-cleanup when the remote peer drops abruptly (app close, network loss)
      peerConnection.current.onconnectionstatechange = () => {
        const state = peerConnection.current?.connectionState;
        if (state === "disconnected" || state === "failed") {
          console.log(`📞 [WEBRTC] Connection state changed to "${state}" — cleaning up`);
          cleanupCall(false);
        }
      };
      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState;
        if (state === "disconnected" || state === "failed") {
          console.log(`📞 [ICE] ICE connection state changed to "${state}" — cleaning up`);
          cleanupCall(false);
        }
      };

      // 3. Mount the hardware microphone stream tracks straight inside the connection line
      stream.getTracks().forEach((track) => {
        peerConnection.current?.addTrack(track, stream);
      });
      
      // 4. Fixed: Explicit un-muting of audio engine target nodes
      peerConnection.current.ontrack = (event) => {
        console.log("🎵 Remote network audio track captured successfully!", event);
        const audioNode = document.getElementById("patientAudioDriver") as HTMLAudioElement;
        if (audioNode) {
          audioNode.muted = false; 
          audioNode.volume = 1.0;

          if (event.streams && event.streams[0]) {
            audioNode.srcObject = event.streams[0];
          } else {
            console.log("⚙️ Stream wrapper absent. Bundling dynamic tracking stream wrapper container...");
            audioNode.srcObject = new MediaStream([event.track]);
          }

          audioNode.load(); // Forces media pipeline thread reconfiguration
          const playPromise = audioNode.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn("⚠️ Browser blocked immediate autoplay! Attaching tap-to-listen user listener fallback.", error);
              window.addEventListener('click', () => {
                audioNode.play().catch(e => console.error("Final audio unblock attempt failed:", e));
              }, { once: true });
            });
          }
        }
      };

      // 5. Build framework callback to intercept and relay local ICE connection channels
      peerConnection.current.onicecandidate = (event) => {
        const activeCall = currentIncomingCallRef.current;
        if (event.candidate && activeCall) {
          socket.emit("relay-ice-candidate", {
            targetSocketId: activeCall.patientSocketId,
            candidate: event.candidate,
          });
        }
      };

      // 6. Process and accept the phone's cryptographic SDP incoming Offer
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(incomingCall.sdpOffer)
      );

      // 7. 🔥 FIXED: Explicitly declare inbound channels are active during negotiation response
      const answer = await peerConnection.current.createAnswer({
        offerToReceiveAudio: true
      });
      await peerConnection.current.setLocalDescription(answer);

      // 8. Fire the acceptance payload across the line wire to answer the phone
      socket.emit("agent-accept-call", {
        patientSocketId: incomingCall.patientSocketId,
        sdpAnswer: answer,
      });

      setCallConnected(true);
      setIncomingCall(null);
    } catch (err) {
      console.error("WebRTC pipeline crash:", err);
      alert("Failed to initialize system microphone hardware. Confirm localhost or SSL rules apply.");
    }
  };

  // 🔥 FIXED: Complete clean reset across native browser components & audio components
  const handleHangUp = () => {
    cleanupCall(true);
  };

  const filteredTickets = useMemo(() => {
    if (filter === "ALL") return mockTickets;
    return mockTickets.filter((t) => t.urgency === filter);
  }, [filter]);

  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
          <span className="text-sm font-medium text-[#2D3A4A]">
            Authenticating session…
          </span>
        </div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <DashboardShell
      role={session.user.role}
      accent="teal"
      navItems={navItems}
      pageTitle="Call Intake & Routing Hub"
      pageSubtitle="Real-time emergency triage queue and clinician dispatch console"
    >
      <audio id="patientAudioDriver" autoPlay playsInline />

      {callConnected && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <p className="text-sm font-bold text-emerald-900">
              🎙️ Live Audio Peer-to-Peer Connection Stream Active with Patient
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRegModal(true)}
              className="rounded-lg bg-white border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
            >
              Return To Call
            </button>
            <button
              onClick={handleHangUp}
              className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
            >
              Disconnect Line
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Calls Today"
          value="142"
          delta="+12% vs. yesterday"
          trend="up"
          accent="teal"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          }
        />
        <StatCard
          label="Emergency Cases"
          value="18"
          delta="3 awaiting dispatch"
          trend="down"
          accent="amber"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Avg. Queue Time"
          value="11m 24s"
          delta="−3m vs. yesterday"
          trend="up"
          accent="navy"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Field Units Active"
          value="84"
          delta="Verified via GPS"
          trend="flat"
          accent="slate"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          }
        />
      </div>

      <div className="mt-6">
        <SectionCard
          title="Live Triage Queue"
          description="Incoming requests awaiting clinician routing"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", "EMERGENCY", "URGENT", "ROUTINE"] as const).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all ${
                      filter === key
                        ? "border-[#0A2540] bg-[#0A2540] text-white"
                        : "border-slate-200/60 bg-white text-[#2D3A4A] hover:border-[#0A2540] hover:text-[#0A2540]"
                    }`}
                  >
                    {key}
                  </button>
                ),
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  <th className="py-3 pr-4">Ticket</th>
                  <th className="py-3 pr-4">Caller</th>
                  <th className="py-3 pr-4">District</th>
                  <th className="py-3 pr-4">Urgency</th>
                  <th className="py-3 pr-4">Channel</th>
                  <th className="py-3 pr-4">Received</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F9FA]"
                  >
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-[#0A2540]">
                      {t.id}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-[#0A2540]">
                          {t.caller}
                        </span>
                        <span className="font-mono text-[10px] text-[#2D3A4A]">
                          {t.phone}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#2D3A4A]">
                      {t.district}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${urgencyStyles[t.urgency]}`}
                      >
                        {t.urgency}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-[#2D3A4A]">
                      {t.channel}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[#2D3A4A]">
                      {t.receivedAt}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[t.status]}`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:shadow-md">
                        Route →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Emergency Ribbon"
          description="Top-priority dispatches in the last 60 minutes"
          className="lg:col-span-2"
        >
          <ul className="flex flex-col gap-3">
            {mockTickets
              .filter((t) => t.urgency === "EMERGENCY")
              .map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF9900] text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-bold text-[#0A2540]">
                        {t.caller}
                      </span>
                      <span className="text-xs text-[#2D3A4A]">
                        {t.district} • {t.phone}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => clearSession()}
                    className="rounded-lg bg-[#0A2540] px-3 py-2 text-[11px] font-semibold text-white transition-all hover:shadow-md"
                  >
                    Dispatch Unit
                  </button>
                </li>
              ))}
          </ul>
        </SectionCard>

        <SectionCard title="On-Duty Agents" description="Active call center roster">
          <ul className="flex flex-col gap-3">
            {[
              { name: "Tania Sultana", calls: 24, status: "ON CALL" },
              { name: "Arif Mahmud", calls: 19, status: "AVAILABLE" },
            ].map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-[#F8F9FA] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A2540] text-xs font-bold text-[#00D4B2]">
                    {a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-semibold text-[#0A2540]">
                      {a.name}
                    </span>
                  </div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[#00D4B2]/10 text-[#00D4B2]">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <PatientRegistrationModal
        key={callSessionKey}
        open={showRegModal}
        patientPhone={patientPhone || undefined}
        callerName={callerName}
        callerEmail={callerEmail}
        callDuration={callDuration}
        onEndCall={handleHangUp}
        onClose={() => setShowRegModal(false)}
        onSuccess={(result) => {
          router.push(
            `/dashboard/call-center/booking?patientId=${result.id}&mrn=${result.mrn}`,
          );
        }}
      />

      {incomingCall && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
          <div className="pointer-events-auto mt-4 w-full max-w-sm rounded-2xl bg-white px-5 py-4 shadow-2xl border border-slate-200 animate-slide-down">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Incoming Call</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{callerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAnswerCall}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-90 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                <button
                  onClick={handleHangUp}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:scale-90 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.18-.29-.43-.29-.71 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}