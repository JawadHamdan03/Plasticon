import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Modal, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '../../context/CallContext';

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function IncomingCallModal() {
  const { call, acceptCall, rejectCall } = useCall();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (call.status !== 'incoming') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [call.status, pulse]);

  if (call.status !== 'incoming') return null;

  const isVideo = call.type === 'video';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* Animated avatar */}
          <Animated.View style={[s.avatarRing, { transform: [{ scale: pulse }] }]}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(call.remoteName)}</Text>
            </View>
          </Animated.View>

          <Text style={s.name}>{call.remoteName}</Text>
          <Text style={s.sub}>
            {isVideo ? '📹 Incoming video call' : '📞 Incoming voice call'}
          </Text>

          {/* Action buttons */}
          <View style={s.actions}>
            {/* Reject */}
            <View style={s.actionGroup}>
              <TouchableOpacity style={[s.btn, s.reject]} onPress={rejectCall} activeOpacity={0.8}>
                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Decline</Text>
            </View>

            {/* Accept voice */}
            <View style={s.actionGroup}>
              <TouchableOpacity style={[s.btn, s.accept]} onPress={acceptCall} activeOpacity={0.8}>
                <Ionicons name={isVideo ? 'videocam' : 'call'} size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={s.btnLabel}>Accept</Text>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#1a1a2e', borderRadius: 28,
    paddingVertical: 40, paddingHorizontal: 24,
    alignItems: 'center', gap: 14,
  },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 28, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub:         { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  actions:     { flexDirection: 'row', gap: 56, marginTop: 24 },
  actionGroup: { alignItems: 'center', gap: 8 },
  btn: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  reject:   { backgroundColor: '#ef4444' },
  accept:   { backgroundColor: '#22c55e' },
  btnLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
});
