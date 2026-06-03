# Plasticon Factory — Overview

## Company
Plasticon is a plastic manufacturing factory producing two product lines: **Caps** and **Preforms**.

## Products & Machines
| Product   | Machine             | Finished Good ID | Notes                      |
|-----------|---------------------|-----------------|----------------------------|
| Caps      | Caps Line 428sp     | id = 8          | Sold in cartons            |
| Preforms  | Preform Line 430pet | id = 7          | Sold in boxes (PET bottles)|

## Raw Materials
| Material    | Unit        | Default Weight  |
|-------------|-------------|-----------------|
| HDPE        | bags        | 25 kg/bag       |
| LDPE        | bags        | 25 kg/bag       |
| PET         | bags        | 22–30 kg/bag    |
| COLOR       | kg          | —               |
| ADHESIVE    | kg          | —               |
| EMPTY_BAGS  | pieces      | —               |

- Caps machines use: HDPE, LDPE, COLOR
- Preform machines use: PET, COLOR

## Production Entry Formats
**Preform:** `machineId, shiftId, boxes=[{cavities, cycles, numberOfBoxes}], notes`
- Pieces = cavities × cycles × numberOfBoxes per box row
- Default cavities: 72

**Caps:** `machineId, shiftId, cartonsCount, notes`
- 1 carton = 6,000 caps pieces

## Shifts
Three shifts per day. Shift times are stored as UTC ISO strings (1970-01-01THH:MM:00.000Z).
- Shift A: 00:00 – 08:00
- Shift B: 08:00 – 16:00
- Shift C: 16:00 – 23:59

## User Roles
| Role        | Scope                                                    |
|-------------|----------------------------------------------------------|
| ADMIN       | Full access — all users, all data, audit logs, settings  |
| ENGINEER    | Machines, maintenance, quality, production, inventory    |
| ACCOUNTANT  | Finance, invoices, payroll view, expenses, budgets, tax  |
| WORKER      | Production records, attendance, daily tools              |

## Tech Stack
- Backend: Express + TypeScript + Prisma ORM (PostgreSQL)
- Auth: JWT httpOnly cookie (`authToken`), 7-day expiry
- Real-time: Socket.IO on the same server
- API base: `/api` (e.g. `http://localhost:8080/api`)
- File uploads: stored in `Backend/prisma/pictures/`
