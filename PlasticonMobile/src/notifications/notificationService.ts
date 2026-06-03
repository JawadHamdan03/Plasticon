import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../api/client';

// ─── Show notifications as banners even when the app is in the foreground ─────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Request permissions ──────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false; // simulator/emulator — skip

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Plasticon',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }

  return true;
}

// ─── Show a local notification immediately ────────────────────────────────────
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'default' }),
    },
    trigger: null, // fire immediately
  });
}

// ─── Poll backend and fire local notifications for new items ─────────────────

let _lastSeenId = 0;
let _pollTimer: ReturnType<typeof setInterval> | null = null;

export function startNotificationPolling(): void {
  if (_pollTimer) return; // already running
  _pollTimer = setInterval(() => { void pollOnce(); }, 30_000); // every 30 s
  void pollOnce(); // fire immediately on start
}

export function stopNotificationPolling(): void {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function pollOnce(): Promise<void> {
  try {
    const res = await api.get<{ id: number; title: string; message: string; isRead: boolean }[]>(
      '/notifications?limit=20',
    );
    const list = Array.isArray(res) ? res : [];
    const fresh = list.filter((n) => !n.isRead && n.id > _lastSeenId);
    if (fresh.length === 0) return;

    _lastSeenId = Math.max(...fresh.map((n) => n.id));

    for (const n of fresh.slice(0, 3)) {
      await showLocalNotification(n.title, n.message, { notificationId: n.id });
    }
    // If more than 3 unread at once, show a summary instead of spamming
    if (fresh.length > 3) {
      await showLocalNotification(
        'Plasticon',
        `You have ${fresh.length} new notifications`,
        { batch: true },
      );
    }
  } catch {
    // silently ignore — user may be offline or logged out
  }
}

// ─── Badge count helpers ──────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
