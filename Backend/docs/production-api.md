# Production API

Base path: /production

## POST /production
- Access: WORKER, ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - cartonsCount (required, zero or positive integer)
  - shiftId (optional if user has assigned shift)
  - hourSlot (optional)
  - rawHdpeUsed (optional, zero or positive number)
  - rawLdpeUsed (optional, zero or positive number)
  - rawPetUsed (optional, zero or positive number)
  - adhesiveUsed (optional, zero or positive number)
  - emptyBagsUsed (optional, zero or positive number)
  - colorUsed (optional, zero or positive number)
  - downtimeReason (optional)
  - downtimeMinutes (optional, zero or positive number)
  - notes (optional)
- Notes:
  - machine and shift must exist
  - production setting must exist for mapped machine product type

## GET /production/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

## GET /production/all
- Access: ACCOUNTANT, ADMIN

## Examples

Create production record:

POST /production
{
  "machineId": 2,
  "cartonsCount": 120,
  "rawHdpeUsed": 54.5,
  "downtimeMinutes": 15,
  "notes": "Stable run"
}

Create response:

{
  "id": 301,
  "machineId": 2,
  "cartonsCount": 120,
  "totalPieces": 216000,
  "createdAt": "2026-04-02T09:00:00.000Z"
}
