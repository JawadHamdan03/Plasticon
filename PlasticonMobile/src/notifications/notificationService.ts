import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';


// Show notifications as banners even when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch { /* Expo Go may not support all handler options */ }

// ─── Request permissions ──────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false; // emulator/simulator

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Plasticon',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false; // gracefully degrade in Expo Go or unsupported environments
  }
}

// ─── Show a local notification immediately ────────────────────────────────────
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
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
  } catch { /* ignore if notifications are unavailable */ }
}

// ─── Poll backend and fire local notifications for new unread items ───────────

let _lastSeenId = 0;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _notificationsGranted = false;

export function startNotificationPolling(granted = true): void {
  _notificationsGranted = granted;
  if (_pollTimer) return;
  void pollOnce();
  _pollTimer = setInterval(() => { void pollOnce(); }, 30_000); // every 30 s
}

export function stopNotificationPolling(): void {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function pollOnce(): Promise<void> {
  try {
    const res = await api.get<any>('/notifications?limit=20');
    const list: { id: number; title: string; message: string; isRead: boolean }[] =
      Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];

    // Only look at items newer than what we've already seen
    const fresh = list.filter((n) => !n.isRead && n.id > _lastSeenId);
    if (fresh.length === 0) return;

    _lastSeenId = Math.max(...fresh.map((n) => n.id));

    if (!_notificationsGranted) return; // permission denied — just track IDs

    if (fresh.length <= 3) {
      for (const n of fresh) {
        await showLocalNotification(n.title, n.message, { notificationId: n.id });
      }
    } else {
      // Batch into a single summary to avoid spamming
      await showLocalNotification(
        'Plasticon',
        `You have ${fresh.length} new notifications`,
        { batch: true },
      );
    }
  } catch {
    // Silently ignore — user may be offline, logged out, or in Expo Go
  }
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  try { await Notifications.setBadgeCountAsync(count); } catch { /* ignore */ }
}

export async function clearBadge(): Promise<void> {
  try { await Notifications.setBadgeCountAsync(0); } catch { /* ignore */ }
}

// ─── Remote push token registration ──────────────────────────────────────────

let _lastPushToken: string | null = null;

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return; // skip emulators / Expo Go web

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const projectId =
      ((Constants.expoConfig?.extra as Record<string, any> | undefined)
        ?.eas?.projectId as string | undefined) || undefined;

    if (!projectId) {
      // No EAS project ID configured — push notifications unavailable.
      // Run `npx eas init` in the project root to set one up.
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    if (!token || token === _lastPushToken) return;
    _lastPushToken = token;

    await api.post('/notifications/push-token', {
      token,
      platform: Platform.OS,
    });
  } catch (err) {
    console.warn('[Push] registerPushToken skipped:', err);
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    _lastPushToken = null;
    await (api.delete as (path: string) => Promise<unknown>)('/notifications/push-token').catch(() => undefined);
  } catch {
    // ignore on logout
  }
}
