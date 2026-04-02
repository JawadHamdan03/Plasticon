# Notifications API

Base path: /notifications

Access for read endpoints:
- WORKER, ENGINEER, ACCOUNTANT, ADMIN

## GET /notifications
- Query:
  - page (optional, default 1)
  - limit (optional, default 20, max 100)
  - isRead (optional true/false)
  - type (optional NotificationType)

## GET /notifications/unread-count
- Description: current user's unread notification count

## PATCH /notifications/:id/read
- Params:
  - id (positive integer)
- Rules:
  - user can mark only their own notification

## PATCH /notifications/read-all
- Description: mark all current user's unread notifications as read

## POST /notifications
- Access: ADMIN
- Body:
  - title (required)
  - message (required)
  - type (required NotificationType)
  - userId (optional)
  - userIds (optional)
  - chatGroupId (optional)
  - machineId (optional)
  - productionId (optional)
- Rules:
  - at least one target user is required via userId or userIds

For full examples and realtime behavior details, also see:
- ../NOTIFICATION_API_GUIDE.md

## Examples

List unread chat notifications:

GET /notifications?page=1&limit=20&isRead=false&type=CHAT_MESSAGE

Unread count response:

{
  "unreadCount": 4
}

Mark one as read:

PATCH /notifications/12/read

Create notification (admin):

POST /notifications
{
  "title": "Payroll ready",
  "message": "Your payroll is ready",
  "type": "PAYROLL_READY",
  "userId": 5
}
