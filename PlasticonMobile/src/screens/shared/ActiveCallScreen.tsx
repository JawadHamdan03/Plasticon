import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
let RTCView: any = null;
try { RTCView = require('react-native-webrtc').RTCView; } catch (_) {}
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '../../context/CallContext';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function ActiveCallScreen() {
  const { call, endCall, toggleMute, toggleCamera, toggleSpeaker } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const visible = call.status === 'calling' || call.status === 'connected';
  const isVideo = call.type === 'video';

  useEffect(() => {
    if (call.status === 'connected' && call.connectedAt) {
      timer.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - call.connectedAt!.getTime()) / 1000));
      }, 1000);
    } else {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      setElapsed(0);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [call.status, call.connectedAt]);

  if (!visible) return null;

  return (
    <Modal visible transparent={false} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={s.root}>

        {/* ── Remote video (full bg) or avatar ─────────────────────────── */}
        {isVideo && call.remoteStream && RTCView ? (
          <RTCView
            streamURL={(call.remoteStream as any).toURL()}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View style={s.avatarBg}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>{initials(call.remoteName)}</Text>
            </View>
          </View>
        )}

        {/* ── Dark overlay ─────────────────────────────────────────────── */}
        <View style={s.overlay} />

        {/* ── Header: name + status ────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.remoteName}>{call.remoteName}</Text>
          <Text style={s.status}>
            {call.status === 'calling'
              ? (call.remoteUserId !== 0 ? 'جاري الاتصال…' : 'جاري التوصيل…')
              : formatDuration(elapsed)}
          </Text>
        </View>

        {/* ── Local video (PiP) ────────────────────────────────────────── */}
        {isVideo && call.localStream && !call.isCameraOff && RTCView && (
          <View style={s.localPip}>
            <RTCView
              streamURL={(call.localStream as any).toURL()}
              style={s.localVideo}
              objectFit="cover"
              mirror
            />
          </View>
        )}

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <View style={s.controls}>
          <CtrlBtn
            icon={call.isMuted ? 'mic-off' : 'mic'}
            label={call.isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            onPress={toggleMute}
            active={call.isMuted}
          />

          {isVideo && (
            <CtrlBtn
              icon={call.isCameraOff ? 'videocam-off' : 'videocam'}
              label={call.isCameraOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
              onPress={toggleCamera}
              active={call.isCameraOff}
            />
          )}

          <CtrlBtn
            icon={call.isSpeakerOn ? 'volume-high' : 'volume-low'}
            label={call.isSpeakerOn ? 'مكبر الصوت' : 'سماعة الأذن'}
            onPress={toggleSpeaker}
          />

          {/* End call */}
          <TouchableOpacity style={s.endBtn} onPress={endCall} activeOpacity={0.8}>
            <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

function CtrlBtn({ icon, label, onPress, active }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; onPress: () => void; active?: boolean;
}) {
  return (
    <View style={c.btnGroup}>
      <TouchableOpacity
        style={[c.btn, active && c.btnActive]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={c.btnLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0D1321' },
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  avatarBg:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  avatarCircle:{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  header:      { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 10 },
  remoteName:  { fontSize: 28, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  status:      { fontSize: 16, color: 'rgba(255,255,255,0.75)' },
  localPip:    { position: 'absolute', top: 100, right: 20, width: 100, height: 140, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
  localVideo:  { flex: 1 },
  controls:    { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 24, paddingHorizontal: 20, zIndex: 10 },
  endBtn:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
});

const c = StyleSheet.create({
  btnGroup: { alignItems: 'center', gap: 6 },
  btn:      { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  btnActive:{ backgroundColor: 'rgba(255,255,255,0.4)' },
  btnLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
});
