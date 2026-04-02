# Attendance API

Base path: /attendance

## POST /attendance/check-in
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body: none
- Notes:
  - blocks early check-in before shift start
  - blocks duplicate open attendance and duplicate same-shift daily records

## POST /attendance/check-out
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body: none
- Notes:
  - requires an open attendance record
  - blocks early check-out before shift end

## GET /attendance/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: current user's attendance history

## GET /attendance/all
- Access: ADMIN
- Description: all attendance records

## Examples

Check in request:

POST /attendance/check-in

Check in response:

{
  "id": 51,
  "userId": 5,
  "checkIn": "2026-04-02T08:05:00.000Z",
  "lateMinutes": 0,
  "overtimeMinutes": 0
}

Check out request:

POST /attendance/check-out
