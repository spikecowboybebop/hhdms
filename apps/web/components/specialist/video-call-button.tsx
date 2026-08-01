'use client';

import { useEffect, useState } from 'react';
import { useVideoCall } from '@/hooks/use-video-call';
import { VideoCallPanel } from './video-call-panel';

interface VideoCallButtonProps {
  referralId: string;
  patientId: string;
  patientName: string;
  specialistName: string;
}

export function VideoCallButton({ referralId, patientId, patientName, specialistName }: VideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { status, localVideoTrack, remoteUsers, startCall, endCall } = useVideoCall();

  // Close the panel automatically when the remote side ends the call.
  useEffect(() => {
    if (status === 'ended') {
      setIsOpen(false);
    }
  }, [status]);

  const handleStart = async () => {
    setIsOpen(true);
    await startCall(referralId, patientId, specialistName);
  };

  const handleEnd = () => {
    endCall();
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleStart}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#00D4B2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00D4B2]/90 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        Start Video Call
      </button>

      {isOpen && (
        <VideoCallPanel
          status={status}
          localVideoTrack={localVideoTrack}
          remoteUsers={remoteUsers}
          onEndCall={handleEnd}
          patientName={patientName}
        />
      )}
    </>
  );
}
