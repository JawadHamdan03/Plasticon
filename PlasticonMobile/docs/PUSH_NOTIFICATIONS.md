# Push Notifications

## Overview

The mobile app uses **Expo Notifications** to receive push alerts even when the app is in the background or closed. The flow involves:
1. Registering the device and obtaining an Expo push token
2. Sending that token to the backend for storage
3. The backend triggers pushes via the Expo Push API

---

## Push Token Registration — `src/notifications/notificationService.ts`

Called once after the user logs in:

```typescript
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { apiRequest } from "../api/client";

export async function registerForPushNotifications(): Promise<void> {
  // Step 1: Only physical devices support push (not simulators)
  if (!Device.isDevice) {
    console.log("Push notifications not available in simulator");
    return;
  }

  // Step 2: Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return;
  }

  // Step 3: Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });
  const pushToken = tokenData.data;  // "ExponentPushToken[xxxxxxxxxxxxxxxx]"

  // Step 4: Register token with backend
  await apiRequest("/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({ token: pushToken }),
  });
}
```

---

## Backend Token Storage

`POST /notifications/push-token` stores the token in the `PushToken` table:

```
PushToken {
  id:     Int
  userId: Int   ← which user owns this device
  token:  String ← the Expo push token
}
```

One user can have multiple tokens (multiple devices). All are tried when sending a push.

---

## How the Backend Sends Pushes — `services/pushService.ts`

```typescript
export async function sendPushToUsers(
  userIds: number[],
  title: string,
  body: string,
  data: object = {}
): Promise<void> {
  // 1. Load all push tokens for these users
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  // 2. Build Expo push messages
  const messages = tokens.map(t => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data,
  }));

  // 3. POST to Expo Push API
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}
```

This is called from:
- `notificationScheduler.ts` — shift start/end reminders, check-in/out alerts, payroll reminder
- `notificationServices.ts` — any time a notification record is created for a user
- `registrationRequestController.ts` — when admin approves a registration request

---

## When Push Notifications Are Sent

| Trigger | Who receives | Content |
|---|---|---|
| 30 min before shift starts | All users on that shift | "Shift starting soon — get ready" |
| 20 min before shift ends | Users still checked in | Role-specific end-of-shift reminders |
| 30 min after shift starts | Users who haven't checked in | "You haven't checked in yet" |
| 30 min after shift ends | Users who haven't checked out | "You haven't checked out yet" |
| 10th of month, 9 AM | All active users | "Your monthly salary is ready" |
| New notification from system | Target user | Full notification content |

---

## Foreground Notification Handling

When the app is open and a push arrives, Expo would normally not show a banner. To override this:

```typescript
// In App.tsx or notificationService.ts, called once at startup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // show banner even in foreground
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## Notification Tap Handler

When the user taps a push notification, the app should navigate to the relevant screen:

```typescript
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;

    switch (data.type) {
      case "SHIFT_START":
      case "SHIFT_END":
        navigation.navigate("AttendanceScreen");
        break;
      case "CHECK_IN_REMINDER":
        navigation.navigate("AttendanceScreen");
        break;
      case "PAYROLL_REMINDER":
        navigation.navigate("PayrollScreen");
        break;
      default:
        navigation.navigate("NotificationsScreen");
    }
  });

  return () => sub.remove();
}, []);
```

The `data` object in the push message (set by `sendPushToUsers`) provides the `type` field used for deep-linking.

---

## Real-Time Notifications (Socket.IO)

In addition to push notifications, the mobile app connects to the backend Socket.IO server for instant in-app alerts when the app is open:

```typescript
// In NotificationsScreen or AppTopBar
useEffect(() => {
  socket.connect();
  socket.on("notification:new", (n) => {
    setNotifications(prev => [n, ...prev]);
    // also increment badge count
  });
  socket.on("notification:unread-count-updated", () => {
    void fetchUnreadCount();
  });
  return () => {
    socket.off("notification:new");
    socket.off("notification:unread-count-updated");
    socket.disconnect();
  };
}, []);
```

Push notifications = offline/background alerts.
Socket events = instant in-app alerts when the user is actively using the app.
Both systems work together so no notification is missed.

---

## Badge Count

The notification bell in `AppTopBar` shows a red badge with the unread count:

```typescript
const [unreadCount, setUnreadCount] = useState(0);

const fetchUnreadCount = async () => {
  const { count } = await apiRequest<{ count: number }>("/notifications/unread-count");
  setUnreadCount(count);
};

// Also update the OS app icon badge
Notifications.setBadgeCountAsync(unreadCount);
```

The badge on the app icon (visible on the home screen) mirrors the in-app badge.
