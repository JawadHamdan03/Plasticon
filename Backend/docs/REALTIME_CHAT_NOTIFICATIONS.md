# Real-Time: Chat & Notifications

## Architecture Overview

Real-time features use **Socket.IO** mounted on the same HTTP server as the REST API. This means no second port is needed — both `http://server:8080/api/...` (REST) and `ws://server:8080` (WebSocket) share the same connection.

```
HTTP Server (port 8080)
  ├── Express REST routes
  └── Socket.IO server
        ├── Namespace: /  (default)
        ├── Per-user rooms: user:{userId}   ← notifications
        └── Per-group rooms: group:{groupId} ← chat messages
```

---

## Socket.IO Server — `src/config/socket.ts`

### Authentication Middleware

Every socket connection is authenticated before it can join any room:

```
Client connects with: { auth: { token: "Bearer <jwt>" } }
                   or: headers.authorization = "Bearer <jwt>"

Socket middleware:
  1. Extract token from auth.token or headers.authorization
  2. jwt.verify(token, JWT_SECRET) → decode userId
  3. prisma.user.findUnique(userId) → confirm user exists
  4. socket.data.userId = user.id
  5. next()  ← connection accepted
```

Unauthenticated connections receive an error and are disconnected immediately.

### Room Management

```
On connect:
  socket.join(`user:${userId}`)   ← automatic, every user

On "join:group" event from client:
  1. Verify groupId is a positive integer
  2. prisma.groupMember.findUnique({ groupId, userId })  ← membership check
  3. If member: socket.join(`group:${groupId}`)
  4. Emit "joined:group" confirmation
  5. If not member: emit "error:chat"

On "leave:group" event:
  socket.leave(`group:${groupId}`)
```

### Emitter Functions (exported for services to call)

| Function | Event emitted | Target |
|---|---|---|
| `emitChatMessageToGroup(groupId, payload)` | `chat:message` | room `group:{groupId}` |
| `emitUnreadCountUpdate(userId, payload)` | `chat:unread-count-updated` | room `user:{userId}` |
| `emitNotificationToUser(userId, payload)` | `notification:new` | room `user:{userId}` |
| `emitNotificationUnreadCountUpdate(userId, payload)` | `notification:unread-count-updated` | room `user:{userId}` |

---

## Chat System

### Data Model

```
ChatGroup         id, name, createdAt
GroupMember       groupId, userId  (many-to-many junction)
GroupMessage      id, groupId, senderId, content, createdAt
```

### Message Flow

```
User types message in ChatPage → POST /chat/groups/{groupId}/messages

chatRoutes.ts
  → authorizeRoles([WORKER, ENGINEER, ACCOUNTANT, ADMIN])
  → chatController.sendMessage()
  → chatServices.createMessage()
      → verify sender is GroupMember
      → prisma.groupMessage.create({ groupId, senderId, content })
      → emitChatMessageToGroup(groupId, newMessage)   ← all group members receive it live
      → update unread counts for all members except sender
      → emitUnreadCountUpdate(userId, {...}) for each member
  → return 201 with message object
```

### Unread Count System

Every GroupMember record stores `lastReadAt`. Unread count = messages where `createdAt > lastReadAt`. The frontend polls or receives the `chat:unread-count-updated` event to refresh badge counts.

---

## Notification System

### Data Model

```
Notification  id, userId, title, message, type, isRead, createdAt
NotificationType enum:
  SYSTEM_MESSAGE | MAINTENANCE_ALERT | QUALITY_ALERT |
  INVENTORY_ALERT | ATTENDANCE_ALERT | PAYROLL_NOTIFICATION | GENERAL
```

### Creating a Notification (any service)

```typescript
const notification = await prisma.notification.create({
  data: { userId, title, message, type: NotificationType.MAINTENANCE_ALERT }
});

emitNotificationToUser(userId, notification);               // real-time socket
emitNotificationUnreadCountUpdate(userId, { refresh: true }); // badge refresh
await sendPushToUsers([userId], title, message, metadata);  // mobile push
```

### Notification API

```
GET  /notifications         → list for current user (paginated)
GET  /notifications/unread-count → number badge count
PATCH /notifications/:id/read  → mark one as read
PATCH /notifications/read-all  → mark all as read
```

---

## Push Notifications — `services/pushService.ts`

Mobile devices register their Expo push token when the app starts:

```
POST /notifications/push-token  { token: "ExponentPushToken[...]" }
  → stores in PushToken table (userId + device token)
```

Sending a push notification:

```typescript
sendPushToUsers(userIds: number[], title: string, body: string, data: object)
  → prisma.pushToken.findMany({ where: { userId: { in: userIds } } })
  → POST https://exp.host/--/api/v2/push/send  (Expo push API)
      with each { to: token, title, body, data }
```

Push notifications reach devices even when the app is closed or backgrounded.

---

## Notification Scheduler — `services/notificationScheduler.ts`

Started once at server boot via `startNotificationScheduler()`. Uses **node-cron** to run checks on a schedule.

### Schedule 1 — Every Minute: Shift Reminders

Four functions run every minute and compare current UTC time against shift start/end times:

#### `checkShiftStartReminders()`
- Fires when `minutesUntilShiftStart ∈ [29, 31]` (i.e., ~30 minutes before)
- Sends to all active users assigned to that shift
- Bilingual message (Arabic + English)

#### `checkShiftEndReminders()`
- Fires when `minutesUntilShiftEnd ∈ [19, 21]` (i.e., ~20 minutes before)
- Targets only users who have an open attendance record (checked in, not checked out)
- Message is role-specific: Workers/Engineers told to log production + electricity; Accountants told to log consumption

#### `checkMissingCheckIn()`
- Fires when `minutesSinceShiftStart ∈ [29, 31]` (i.e., ~30 minutes after start)
- Finds users assigned to shift who have NOT checked in today
- Uses **sentinel sets** to fire only once per shift per calendar day

#### `checkMissingCheckOut()`
- Fires when `minutesSinceShiftEnd ∈ [29, 31]` (i.e., ~30 minutes after end)
- Finds users who checked in but have no checkout record
- Also uses sentinel sets

### Sentinel Pattern (duplicate prevention)

```typescript
const sentCheckInReminders  = new Set<string>();  // keys: "{shiftId}-{YYYY-MM-DD}"
const sentCheckOutReminders = new Set<string>();

// Before firing:
const key = `${shiftId}-${today}`;
if (sentCheckInReminders.has(key)) continue;  // already sent today
sentCheckInReminders.add(key);

// Each minute: pruneOldSentinels() removes keys that don't match today's date
```

### Schedule 2 — Monthly Payroll Reminder

```
cron: "0 9 10 * *"  →  runs at 09:00 AM on the 10th of every month
  → fetches all active users
  → creates Notification record for each
  → socket unread count refresh for each user
  → Expo push to all registered devices
```

---

## Frontend Connection (Web)

`Frontend/src/lib/socket.ts` connects to the backend:

```typescript
const socket = io(API_BASE_URL, {
  auth: { token: `Bearer ${localStorage.getItem("plasticon_token")}` }
});

socket.on("notification:new", (n) => { /* show toast + update badge */ });
socket.on("chat:message", (msg) => { /* append to chat feed */ });
socket.on("chat:unread-count-updated", () => { /* refresh badge */ });
```

---

## Mobile Connection

`PlasticonMobile/src/notifications/notificationService.ts` handles:
1. Requesting Expo notification permissions
2. Getting the Expo push token
3. Sending the token to `POST /notifications/push-token`
4. Setting up foreground notification handlers
