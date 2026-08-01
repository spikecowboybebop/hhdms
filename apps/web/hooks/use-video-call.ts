'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng';
import { io, type Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

function getAuthToken(): string {
  const session = window.localStorage.getItem('hhdms.session');
  if (!session) return '';
  try {
    return JSON.parse(session).token || '';
  } catch {
    return '';
  }
}

export type VideoCallStatus = 'idle' | 'ringing' | 'active' | 'ended';

export interface RemoteUser {
  uid: number | string;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
}

export function useVideoCall() {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);

  const [status, setStatus] = useState<VideoCallStatus>('idle');
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    localAudioRef.current?.stop();
    localAudioRef.current?.close();
    localVideoRef.current?.stop();
    localVideoRef.current?.close();
    localAudioRef.current = null;
    localVideoRef.current = null;
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);

    clientRef.current?.leave();
    clientRef.current = null;

    setRemoteUsers([]);
    setStatus('ended');
  }, []);

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const token = getAuthToken();
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[VideoCall] Socket connected');
    });

    socket.on('video-call:ringing', (data: { sessionId: string; specialistName: string; channelName: string }) => {
      console.log('[VideoCall] Ringing:', data);
      setSessionId(data.sessionId);
      setStatus('ringing');
    });

    socket.on('video-call:ready', async (data: { sessionId: string; token: string; appId: string; channelName: string; uid: number }) => {
      console.log('[VideoCall] Ready:', data);
      setSessionId(data.sessionId);
      setStatus('active');

      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioRef.current = audioTrack;
        localVideoRef.current = videoTrack;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        await client.join(data.appId, data.channelName, data.token, data.uid);
        await client.publish([audioTrack, videoTrack]);

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && user.videoTrack) {
            setRemoteUsers((prev) => {
              const exists = prev.find((u) => u.uid === user.uid);
              if (exists) {
                return prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u));
              }
              return [...prev, { uid: user.uid, videoTrack: user.videoTrack }];
            });
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
            setRemoteUsers((prev) => {
              const exists = prev.find((u) => u.uid === user.uid);
              if (exists) {
                return prev.map((u) => (u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u));
              }
              return [...prev, { uid: user.uid, audioTrack: user.audioTrack }];
            });
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: undefined } : u)));
          }
        });

        client.on('user-left', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });
      } catch (e) {
        console.error('[VideoCall] Failed to join channel:', e);
        setError(e instanceof Error ? e.message : 'Failed to join video call');
      }
    });

    socket.on('video-call:end', () => {
      console.log('[VideoCall] Call ended');
      cleanup();
    });

    socket.on('disconnect', () => {
      console.log('[VideoCall] Socket disconnected');
    });

    socketRef.current = socket;
    return socket;
  }, [cleanup]);

  const startCall = useCallback(
    async (referralId: string, patientId: string, specialistName: string) => {
      setError(null);
      const socket = initSocket();

      await new Promise<void>((resolve) => {
        if (socket.connected) resolve();
        else socket.once('connect', () => resolve());
      });

      socket.emit('video-call:start', {
        referralId,
        patientId,
        specialistName,
      });

      setStatus('ringing');
    },
    [initSocket],
  );

  const acceptCall = useCallback(
    (sid: string) => {
      socketRef.current?.emit('video-call:accept', { sessionId: sid });
    },
    [],
  );

  const declineCall = useCallback(
    (sid: string) => {
      socketRef.current?.emit('video-call:decline', { sessionId: sid });
      cleanup();
      setSessionId(null);
      setStatus('idle');
    },
    [cleanup],
  );

  const endCall = useCallback(() => {
    if (sessionId) {
      socketRef.current?.emit('video-call:end', { sessionId });
    }
    cleanup();
    setSessionId(null);
    setStatus('idle');
  }, [sessionId, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [cleanup]);

  return {
    status,
    sessionId,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    error,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  };
}
