# Plasticon — Factory Management System

Full-stack ERP for a plastics factory. Node.js/Express/Prisma backend + React/Vite frontend.

---

## Project Structure

```
Plasticon/
├── Backend/          # Express API on port 8080
│   ├── prisma/       # schema.prisma, migrations/, seed.ts, pictures/ (uploads)
│   └── src/
│       ├── app.ts              # Server entry, route mounting
│       ├── config/             # prisma client, socket.io init
│       ├── controllers/        # HTTP handlers (call services, return responses)
│       ├── middleware/         # authMiddleware (authorizeRoles)
│       ├── routes/             # One file per feature, explicit role guards
│       ├── services/           # Business logic → ServiceResult<T>
│       └── utils/              # emailService, uploadHandler, authServices (JWT)
└── Frontend/
    └── src/
        ├── App.tsx             # All routes + role guards
        ├── components/         # ProtectedRoute, AdminOnlyRoute, RoleProtectedRoute, UI primitives
        ├── content/            # i18n strings (appCopy, authCopy) — en + ar
        ├── context/            # AuthContext, LocaleContext, ThemeContext
        ├── lib/                # api.ts, toast.ts, dialog.ts, socket.ts
        └── pages/
            ├── auth/           # Login, Register, ForgotPassword, ResetPassword, RequestAccess
            ├── shared/         # Pages visible to multiple roles
            ├── admin/          # Admin-only pages
            ├── engineer/       # Engineer-specific pages
            ├── accountant/     # Accountant-specific pages
            └── worker/         # Worker-specific pages
```

---

## Dev Commands

### Backend (`cd Backend`)
```bash
npm run dev            # kill port 8080, start with tsx (no hot-reload — restart on changes)
npm run seed           # seed shifts, users, machines, materials (safe to re-run — uses upsert)
npm run apply-schema   # prisma migrate dev + prisma generate
npm test               # vitest run
```

### Frontend (`cd Frontend`)
```bash
npm run dev            # Vite dev server on port 5173
npm run build          # tsc + vite build
npm run lint           # ESLint
```

---

## Seed Credentials

Run `npm run seed` from `Backend/` once to bootstrap.

| Role | Email | Username | Password |
|------|-------|----------|----------|
| ADMIN | admin@plasticon.local | admin | `Pass1234!` |
| WORKER | worker@plasticon.local | worker | `Pass1234!` |
| ENGINEER | engineer@plasticon.local | engineer | `Pass1234!` |
| ACCOUNTANT | accountant@plasticon.local | accountant | `Pass1234!` |

Seed also creates: Shifts A/B/C, 2 machines (Caps 428sp, Preform 430pet), 6 raw materials (HDPE, LDPE, PET, ADHESIVE, EMPTY_BAGS, COLOR), production settings, default supplier/customer.

---

## Role System

```
UserRole: WORKER | ENGINEER | ACCOUNTANT | ADMIN
```

| Feature | WORKER | ENGINEER | ACCOUNTANT | ADMIN |
|---------|--------|----------|------------|-------|
| Production (create) | ✓ | ✓ | — | — |
| Production (view all) | — | ✓ | ✓ | ✓ |
| Maintenance (create) | ✓ | ✓ | — | — |
| Quality Checks (create) | — | ✓ | — | — |
| Electricity (record) | ✓ | ✓ | — | — |
| Sales / Purchases | — | — | ✓ | — |
| Inventory transactions | — | — | ✓ | — |
| Payroll (manage) | — | — | ✓ | ✓ |
| Attendance (manage all) | — | — | ✓ | ✓ |
| Shifts / Machines / Settings | — | — | — | ✓ |
| User management | — | — | — | ✓ |
| All reads | ✓ | ✓ | ✓ | ✓ |

**Admin view-only pages:** Production, Consumption, Maintenance, Quality Checks — admin sees records but cannot submit new ones.

---

## Authentication

- JWT token, expires 1 hour. Stored in `localStorage.plasticon_token` and httpOnly cookie `authToken`.
- All requests send: `Authorization: Bearer <token>` + `credentials: "include"`.
- `authorizeRoles(roles[])` middleware: reads from cookie or Authorization header, verifies JWT, checks role → 401 if missing/invalid, 403 if wrong role.

---

## Backend Patterns

### ServiceResult
Every service returns `ServiceResult<T>`:
```typescript
type ServiceResult<T> = { status: number; message?: string; data?: T };

// In controller:
const result = await someService(...);
if (result.message && result.status !== 200) {
  res.status(result.status).json({ message: result.message }); return;
}
res.status(result.status).json(result.data);
```

### Route ordering — CRITICAL
Static paths must come before `:id` parameter routes. Express matches first-to-last.
```typescript
// ✓ Correct
router.get("/salary-config", handler);
router.get("/daily", handler);
router.get("/daily/me", handler);
router.get("/admin/overview", handler);
router.get("/me", handler);
router.get("/", handler);
router.get("/:id", handler);   // ← always last

// ✗ Wrong — /:id intercepts /daily, /salary-config, etc.
router.get("/:id", handler);
router.get("/daily", handler);  // never reached
```

### Audit logging
Use `auditAsync(userId, action, entityType, entityId, changes?)` — fire-and-forget, never await in hot paths.

---

## Frontend Patterns

### Auth fetch helper
```typescript
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    credentials: "include",
  });
}
```

### Error reading
```typescript
import { readApiError } from "../../lib/api";
// readApiError reads response.json().error ?? .message ?? "Something went wrong."
if (!res.ok) throw new Error(await readApiError(res));
```

### Role-based routing (App.tsx)
```tsx
<RoleProtectedRoute allowedRoles={["ADMIN", "ENGINEER"]}>
  <SomePage />
</RoleProtectedRoute>
```

### i18n
All user-facing text uses `appCopy[locale]` or inline `isAr ? "..." : "..."`. Both Arabic (RTL) and English supported. Direction set via `dir={locale === "ar" ? "rtl" : "ltr"}`.

---

## Shift Time System

Shifts stored as `DateTime` but represent time-only using a fixed base date:
- Admin enters "08:00" → stored as `"1970-01-01T08:00:00.000Z"` (UTC)
- **Always extract with UTC accessors:**
  ```typescript
  const d = new Date(shift.startTime);
  const hours = d.getUTCHours();    // ✓
  const hours = d.getHours();       // ✗ wrong in non-UTC timezones
  ```
- Current shift detection: compare UTC minutes since midnight
  ```typescript
  const nowMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
  ```
- Overnight shifts (e.g. C shift 16:00–00:00): `endTime <= startTime` → check `now >= start || now < end`

---

## Production Units

- **Preform machine** (type includes "PREFORM" or "PET"): counted by boxes — `cavities × cycles × numberOfBoxes = pieces`. Multiple box rows summed.
- **Caps machine** (type includes "CAP"): counted in cartons. `totalPieces = cartonsCount × piecesPerCarton` (from `ProductionSetting`).
- `piecesPerCarton` is configured per `ProductType` in admin settings.

## Inventory / Raw Material Units

- HDPE, LDPE, PET, ADHESIVE, EMPTY_BAGS, COLOR tracked in the `RawMaterial` table with `unit` field.
- Consumption records send **bag counts** (1 bag = 1 carton in inventory). The kg/bag conversion is display-only, not stored.
- Color tracked in kg separately.

---

## Key Models (schema.prisma)

| Model | Notable Fields |
|-------|----------------|
| `User` | nationalId (unique, 9 digits), username (unique), role, shiftId, isActive, profileCompleted |
| `Shift` | name, startTime, endTime (stored as 1970-01-01T... UTC) |
| `Machine` | name, type, status (MachineStatus enum) |
| `ProductionRecord` | machineId, userId, shiftId, cartonsCount, piecesPerCarton, totalPieces, boxesData (JSON), rawHdpeUsed…colorUsed, notes |
| `Attendance` | userId, shiftId, checkIn, checkOut, lateMinutes, overtimeMinutes |
| `DailyPayroll` | attendanceId (unique), userId, date, hoursWorked, dailyRate, totalDailyPay, isConfirmed, confirmedById |
| `Payroll` | userId, month (YYYY-MM), baseSalary, overtimeSalary, totalSalary |
| `SalaryConfig` | role (unique), monthlySalary — daily rate = monthly ÷ 30 |
| `RawMaterial` | name, currentQuantity, unit, minQuantity |
| `ElectricityReading` | shiftId, startReading, endReading, consumption, kwhPriceSnap, shiftCost |
| `Notification` | userId, title, message, type (NotificationType), isRead |
| `AuditLog` | userId, action, entityType, entityId, changes (JSON) |

---

## File Uploads

- Handled by `multer` via `Backend/src/utils/uploadHandler.ts`
- Stored in `Backend/prisma/pictures/` with timestamp-prefixed filenames
- Served at `/pictures/*` (static route in app.ts)
- Max file size and allowed types enforced in uploadHandler

---

## Real-time (Socket.io)

- Server initialized in `Backend/src/config/socket.ts`
- Frontend connects in `Frontend/src/lib/socket.ts`
- Used for: chat messages, live notifications, unread count updates
- Key emit helpers: `emitNotificationToUser(userId, notification)`, `emitNotificationUnreadCountUpdate(userId, { refresh: true })`

---

## Registration Flow

Two paths:
1. **Admin creates user directly** — `POST /auth/register` (ADMIN only), requires all fields
2. **Self-registration request** — `POST /registration-requests` (public) → admin approves/rejects → email sent with password-set link

---

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://...
PORT=8080
JWT_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
FRONTEND_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:8080
```

### Frontend `.env`
```
VITE_API_BASE_URL=http://localhost:8080
```

---

## Common Gotchas

1. **Backend has no hot-reload** — `tsx src/app.ts` has no file watching. Restart `npm run dev` after every backend change or new routes won't take effect.
2. **Route ordering** — always put specific paths (`/me`, `/all`, `/daily`, `/salary-config`) before `/:id`. Express matches first-to-last; a leading `/:id` silently swallows all static paths registered after it.
3. **Shift times are UTC** — use `getUTCHours()`, never `getHours()`. Shifts are stored as `1970-01-01THH:MM:00.000Z`.
4. **Promise.all failure** — if one call in `Promise.all` can fail independently, use `.catch(() => fallback)` on each to prevent total failure.
5. **Daily payroll auto-calculates on checkout** — `checkOut` event in attendance service triggers `calculateDailyPayroll` automatically.
6. **Salary config** — uses `SalaryConfig` table; fallback hardcoded map exists if no DB config.
7. **Inline styles override responsive CSS** — if an element has both a CSS class with media queries and an inline `style={{ gridTemplateColumns: "..." }}`, the inline style always wins and the layout never collapses on mobile. Use CSS classes only for responsive grid layouts; remove the matching inline property from `style`.
