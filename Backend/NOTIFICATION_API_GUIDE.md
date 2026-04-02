# Notification API Guide

This guide explains the Notification API endpoints, required roles, request formats, and practical usage flow.

## Base Path

All endpoints are under:

/notifications

## Authentication

All endpoints require a valid JWT token.

Send one of the following:

- Authorization header: Bearer <token>
- Cookie-based auth (if your client uses cookies)

## Notification Type Values

Use one of the following values for the type field:

- CHAT_MESSAGE
- PRODUCTION_ALERT
- MAINTENANCE_URGENT
- QUALITY_ISSUE
- SYSTEM_MESSAGE
- PAYROLL_READY
- INVENTORY_LOW

## Endpoints

### 1) Get My Notifications

Method: GET
Path: /notifications
Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

Query params (optional):

- page: number (default 1)
- limit: number (default 20, max 100)
- isRead: true or false
- type: one NotificationType value

Example request:

GET /notifications?page=1&limit=20&isRead=false&type=CHAT_MESSAGE

Example response:

{
  "items": [
    {
      "id": 12,
      "userId": 5,
      "title": "New chat message",
      "message": "You have a new message in Shift A group",
      "type": "CHAT_MESSAGE",
      "isRead": false,
      "readAt": null,
      "chatGroupId": 3,
      "machineId": null,
      "productionId": null,
      "createdAt": "2026-04-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}

### 2) Get Unread Count

Method: GET
Path: /notifications/unread-count
Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

Example response:

{
  "unreadCount": 4
}

### 3) Mark One Notification as Read

Method: PATCH
Path: /notifications/:id/read
Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

Notes:

- You can mark only your own notification.
- If id is invalid, returns 400.
- If notification does not belong to you, returns 404.

Example request:

PATCH /notifications/12/read

Example response:

{
  "id": 12,
  "userId": 5,
  "title": "New chat message",
  "message": "You have a new message in Shift A group",
  "type": "CHAT_MESSAGE",
  "isRead": true,
  "readAt": "2026-04-02T10:05:00.000Z",
  "chatGroupId": 3,
  "machineId": null,
  "productionId": null,
  "createdAt": "2026-04-02T10:00:00.000Z"
}

### 4) Mark All My Notifications as Read

Method: PATCH
Path: /notifications/read-all
Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

Example response:

{
  "updatedCount": 4
}

### 5) Create Notification (Admin)

Method: POST
Path: /notifications
Access: ADMIN only

Body fields:

- title: string (required)
- message: string (required)
- type: NotificationType (required)
- userId: number (optional)
- userIds: number[] (optional)
- chatGroupId: number (optional)
- machineId: number (optional)
- productionId: number (optional)

Rules:

- At least one target user is required via userId or userIds.
- If any target user does not exist, returns 404.
- Creates one notification per target user.

Example request (single user):

{
  "title": "Payroll ready",
  "message": "Your March payroll is ready.",
  "type": "PAYROLL_READY",
  "userId": 5
}

Example request (multiple users):

{
  "title": "System maintenance",
  "message": "System will be offline at 11:00 PM",
  "type": "SYSTEM_MESSAGE",
  "userIds": [2, 5, 9]
}

Example response:

[
  {
    "id": 31,
    "userId": 2,
    "title": "System maintenance",
    "message": "System will be offline at 11:00 PM",
    "type": "SYSTEM_MESSAGE",
    "isRead": false,
    "readAt": null,
    "chatGroupId": null,
    "machineId": null,
    "productionId": null,
    "createdAt": "2026-04-02T12:00:00.000Z"
  },
  {
    "id": 32,
    "userId": 5,
    "title": "System maintenance",
    "message": "System will be offline at 11:00 PM",
    "type": "SYSTEM_MESSAGE",
    "isRead": false,
    "readAt": null,
    "chatGroupId": null,
    "machineId": null,
    "productionId": null,
    "createdAt": "2026-04-02T12:00:00.000Z"
  }
]

## Typical Client Flow

1. User opens app screen.
2. Client calls GET /notifications/unread-count to show badge.
3. User opens notifications page, client calls GET /notifications.
4. When user opens one item, client calls PATCH /notifications/:id/read.
5. Optionally, add a Mark all as read button calling PATCH /notifications/read-all.

## Automatic Notifications (Backend Triggers)

The backend now creates notifications automatically for key business events.

### 1) Payroll calculated

- Source: payroll service (`calculatePayroll`)
- Type: `PAYROLL_READY`
- Target: the employee whose payroll was calculated
- Message includes month and total salary

### 2) Chat message sent

- Source: chat service (`sendGroupMessage`)
- Type: `CHAT_MESSAGE`
- Target: all group members except the sender
- Context: `chatGroupId`

### 3) Urgent maintenance created

- Source: maintenance service (`createMaintenance`)
- Condition: `downtimeMinutes >= 60`
- Type: `MAINTENANCE_URGENT`
- Target: all admins
- Context: `machineId`

### 4) Failed quality check created

- Source: quality service (`createQualityCheck`)
- Condition: `capsStatus == FAIL` or `preformStatus == FAIL`
- Type: `QUALITY_ISSUE`
- Target: all admins
- Context: `machineId`

Notes:

- These notifications are in addition to manual admin-created notifications from `POST /notifications`.
- Automatic notifications are saved in the same `Notification` table and are retrieved via the same read endpoints.

## Realtime Events (Socket.IO)

The backend emits realtime events to the user room (`user:{userId}`) so frontend badges and notification lists can update instantly.

### Event: `notification:new`

- Triggered when a new notification is created (manual or automatic).
- Payload: full notification object.

Example payload:

{
  "id": 42,
  "userId": 5,
  "title": "Payroll ready",
  "message": "Your payroll for 2026-03 is ready.",
  "type": "PAYROLL_READY",
  "isRead": false,
  "readAt": null,
  "createdAt": "2026-04-02T14:00:00.000Z"
}

### Event: `notification:unread-count-updated`

- Triggered when:
  - new notification is created
  - one notification is marked read
  - all notifications are marked read
- Payload example:

{
  "refresh": true
}

Recommended client behavior:

- On receiving this event, call `GET /notifications/unread-count` and refresh the badge number.

### Frontend Socket Example

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:8080", {
  auth: {
    token: "Bearer <JWT_TOKEN>",
  },
});

socket.on("notification:new", (notification) => {
  // Option 1: prepend to in-memory notifications list
  // Option 2: trigger refetch of GET /notifications
  console.log("new notification", notification);
});

socket.on("notification:unread-count-updated", async () => {
  // fetch latest unread count and update badge
  // GET /notifications/unread-count
});
```

## Common Errors

- 400: Invalid id, missing required fields, invalid type, or invalid query/body shape.
- 401: Missing or invalid auth token.
- 403: Role not allowed (for example non-admin creating notifications).
- 404: Notification or user not found.

## Quick Postman Setup

1. Create an environment variable named token.
2. Add Authorization header to requests: Bearer {{token}}.
3. Save one request per endpoint with sample body from this guide.
4. Test in this order:
   - POST /notifications (admin)
   - GET /notifications
   - GET /notifications/unread-count
   - PATCH /notifications/:id/read
   - PATCH /notifications/read-all
