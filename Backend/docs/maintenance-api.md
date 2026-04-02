# Maintenance API

Base path: /maintenance

## POST /maintenance
- Access: ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - partsUsed (required)
  - shiftId (optional if user has assigned shift)
  - downtimeMinutes (optional, zero or positive number)
  - reportText (optional)
  - imagePath (optional)
- Notes:
  - if downtimeMinutes >= 60, automatic MAINTENANCE_URGENT notifications are created for admins

## GET /maintenance/me
- Access: ENGINEER, ADMIN

## GET /maintenance/all
- Access: ACCOUNTANT, ADMIN

## Examples

Create maintenance record:

POST /maintenance
{
  "machineId": 3,
  "partsUsed": "Main bearing",
  "downtimeMinutes": 75,
  "reportText": "Bearing replaced"
}

Response:

{
  "id": 88,
  "machineId": 3,
  "engineerId": 4,
  "downtimeMinutes": 75,
  "createdAt": "2026-04-02T11:20:00.000Z"
}
