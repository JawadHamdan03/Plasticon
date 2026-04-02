# Chat API

Base path: /chat

Access for all endpoints in this file:
- WORKER, ENGINEER, ACCOUNTANT, ADMIN

## POST /chat/groups
- Body:
  - name (required)
  - description (optional)
  - memberIds (optional array of user IDs)

## GET /chat/groups
- Description: current user's groups with unread counts and last message

## GET /chat/groups/unread-counts
- Description: unread counts per group

## GET /chat/groups/:groupId
- Params:
  - groupId (positive integer)
- Rule:
  - requester must be a member of the group

## POST /chat/groups/:groupId/members
- Body:
  - userId (required, positive integer)
  - role (optional GroupRole)
- Rule:
  - only group admins can add members

## DELETE /chat/groups/:groupId/members/:userId
- Rules:
  - only group admins can remove members
  - group admin cannot remove self
  - group creator cannot be removed

## POST /chat/groups/:groupId/messages
- Body:
  - content (required, max 2000 chars)
- Notes:
  - requester must be group member
  - emits realtime group message events
  - creates CHAT_MESSAGE notifications for recipient members

## GET /chat/groups/:groupId/messages
- Query:
  - limit (optional, default 30, max 100)
  - cursor (optional message id)

## PATCH /chat/groups/:groupId/mark-as-read
- Description: marks current user's messages in group as read

## Examples

Create chat group:

POST /chat/groups
{
  "name": "Night Shift",
  "description": "Night operations team",
  "memberIds": [2, 3, 5]
}

Send message:

POST /chat/groups/1/messages
{
  "content": "Machine 3 maintenance is completed"
}

Messages list:

GET /chat/groups/1/messages?limit=30

Mark group as read response:

{
  "groupId": 1,
  "unreadCount": 0,
  "lastReadAt": "2026-04-02T15:00:00.000Z"
}
