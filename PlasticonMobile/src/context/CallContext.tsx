import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';
// Lazy-load react-native-webrtc so the app still runs in Expo Go (no native module there)
let RTCPeerConnection: any = null;
let RTCIceCandidate: any = null;
let RTCSessionDescription: any = null;
let mediaDevices: any = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection    = webrtc.RTCPeerConnection;
  RTCIceCandidate      = webrtc.RTCIceCandidate;
  RTCSessionDescription= webrtc.RTCSessionDescription;
  mediaDevices         = webrtc.mediaDevices;
} catch (_) { /* running in Expo Go — calls disabled */ }

type MediaStream = any;
import { useAuth } from '../auth/AuthContext';
import { initSocket, destroySocket, getSocket } from '../lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallType   = 'video' | 'voice';
export type CallStatus = 'idle' | 'incoming' | 'calling' | 'connected';

export interface ActiveCall {
  status: CallStatus;
  callId: string;
  type: CallType;
  remoteName: string;
  remoteUserId: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  localStream:  MediaStream | null;
  remoteStream: MediaStream | null;
  connectedAt:  Date | null;
}

interface CallContextValue {
  call: ActiveCall;
  initiateCall: (toUserId: number, toName: string, type: CallType) => Promise<void>;
  acceptCall:   () => Promise<void>;
  rejectCall:   () => void;
  endCall:      () => void;
  toggleMute:   () => void;
  toggleCamera: () => void;
  toggleSpeaker:() => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const IDLE_CALL: ActiveCall = {
  status: 'idle', callId: '', type: 'voice',
  remoteName: '', remoteUserId: 0,
  isMuted: false, isCameraOff: false, isSpeakerOn: true,
  localStream: null, remoteStream: null, connectedAt: null,
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside CallProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth() as any;
  const [call, setCall] = useState<ActiveCall>(IDLE_CALL);

  const pc      = useRef<RTCPeerConnection | null>(null);
  const callRef = useRef<ActiveCall>(IDLE_CALL);

  // Keep ref in sync so socket callbacks always see latest state
  useEffect(() => { callRef.current = call; }, [call]);

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { destroySocket(); return; }

    const socket = initSocket();

    // ── Incoming call ──────────────────────────────────────────────────────
    socket.on('call:incoming', (data: { callId: string; type: CallType; callerName: string; callerId: number }) => {
      // Already in a call → send busy
      if (callRef.current.status !== 'idle') {
        socket.emit('call:busy', { toUserId: data.callerId, callId: data.callId });
        return;
      }
      setCall({ ...IDLE_CALL, status: 'incoming', callId: data.callId, type: data.type, remoteName: data.callerName, remoteUserId: data.callerId });
    });

    // ── Call accepted by callee (we were caller) ───────────────────────────
    socket.on('call:accepted', async (data: { callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      await sendOffer();
    });

    // ── Callee rejected ────────────────────────────────────────────────────
    socket.on('call:rejected', (data: { callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      cleanUp();
    });

    // ── Callee is busy ─────────────────────────────────────────────────────
    socket.on('call:busy', (data: { callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      cleanUp();
    });

    // ── Received offer (we are callee) ─────────────────────────────────────
    socket.on('call:offer', async (data: { sdp: RTCSessionDescriptionInit; callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      await handleOffer(data.sdp);
    });

    // ── Received answer (we are caller) ───────────────────────────────────
    socket.on('call:answer', async (data: { sdp: RTCSessionDescriptionInit; callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      try {
        await pc.current?.setRemoteDescription(new RTCSessionDescription(data.sdp));
        setCall(prev => ({ ...prev, status: 'connected', connectedAt: new Date() }));
      } catch (_) {}
    });

    // ── ICE candidate ──────────────────────────────────────────────────────
    socket.on('call:ice', async (data: { candidate: RTCIceCandidateInit; callId: string }) => {
      if (callRef.current.callId !== data.callId || !data.candidate) return;
      try {
        await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (_) {}
    });

    // ── Remote ended call ──────────────────────────────────────────────────
    socket.on('call:ended', (data: { callId: string }) => {
      if (callRef.current.callId !== data.callId) return;
      cleanUp();
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:busy');
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice');
      socket.off('call:ended');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Internal helpers ────────────────────────────────────────────────────────

  const createPC = useCallback((callId: string, remoteUserId: number) => {
    if (!RTCPeerConnection) throw new Error('WebRTC not available in Expo Go');
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    connection.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('call:ice', { toUserId: remoteUserId, candidate: e.candidate.toJSON(), callId });
      }
    };

    connection.ontrack = (e) => {
      if (e.streams[0]) {
        setCall(prev => ({ ...prev, remoteStream: e.streams[0] }));
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        setCall(prev => ({ ...prev, status: 'connected', connectedAt: new Date() }));
      } else if (['failed', 'disconnected', 'closed'].includes(connection.connectionState)) {
        cleanUp();
      }
    };

    pc.current = connection;
    return connection;
  }, []);

  const getUserMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    if (!mediaDevices) throw new Error('WebRTC not available in Expo Go');
    return await mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
    });
  }, []);

  const sendOffer = useCallback(async () => {
    const c = callRef.current;
    if (!pc.current || !c.callId) return;
    try {
      const offer = await pc.current.createOffer({});
      await pc.current.setLocalDescription(new RTCSessionDescription(offer));
      getSocket()?.emit('call:offer', { toUserId: c.remoteUserId, sdp: offer, callId: c.callId });
    } catch (_) {}
  }, []);

  const handleOffer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    const c = callRef.current;
    if (!pc.current || !c.callId) return;
    try {
      await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(new RTCSessionDescription(answer));
      getSocket()?.emit('call:answer', { toUserId: c.remoteUserId, sdp: answer, callId: c.callId });
      setCall(prev => ({ ...prev, status: 'connected', connectedAt: new Date() }));
    } catch (_) {}
  }, []);

  const cleanUp = useCallback(() => {
    // Stop local stream tracks
    callRef.current.localStream?.getTracks().forEach(t => t.stop());
    // Close peer connection
    pc.current?.close();
    pc.current = null;
    setCall(IDLE_CALL);
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────────

  const initiateCall = useCallback(async (toUserId: number, toName: string, type: CallType) => {
    const callId = `${user?.id ?? 0}-${toUserId}-${Date.now()}`;
    try {
      const connection = createPC(callId, toUserId);
      const stream = await getUserMedia(type);
      stream.getTracks().forEach(track => connection.addTrack(track, stream));
      setCall({ ...IDLE_CALL, status: 'calling', callId, type, remoteName: toName, remoteUserId: toUserId, localStream: stream });
      getSocket()?.emit('call:initiate', {
        toUserId, type, callId,
        callerName: (user as any)?.fullName ?? (user as any)?.username ?? 'User',
      });
    } catch (_) { cleanUp(); }
  }, [user, createPC, getUserMedia, cleanUp]);

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (c.status !== 'incoming') return;
    try {
      const connection = createPC(c.callId, c.remoteUserId);
      const stream = await getUserMedia(c.type);
      stream.getTracks().forEach(track => connection.addTrack(track, stream));
      setCall(prev => ({ ...prev, status: 'calling', localStream: stream }));
      getSocket()?.emit('call:accept', { toUserId: c.remoteUserId, callId: c.callId });
    } catch (_) { cleanUp(); }
  }, [createPC, getUserMedia, cleanUp]);

  const rejectCall = useCallback(() => {
    const c = callRef.current;
    if (c.status !== 'incoming') return;
    getSocket()?.emit('call:reject', { toUserId: c.remoteUserId, callId: c.callId });
    cleanUp();
  }, [cleanUp]);

  const endCall = useCallback(() => {
    const c = callRef.current;
    if (c.status === 'idle') return;
    getSocket()?.emit('call:end', { toUserId: c.remoteUserId, callId: c.callId });
    cleanUp();
  }, [cleanUp]);

  const toggleMute = useCallback(() => {
    callRef.current.localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setCall(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleCamera = useCallback(() => {
    callRef.current.localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCall(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  }, []);

  const toggleSpeaker = useCallback(() => {
    setCall(prev => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  return (
    <CallContext.Provider value={{ call, initiateCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, toggleSpeaker }}>
      {children}
    </CallContext.Provider>
  );
}
