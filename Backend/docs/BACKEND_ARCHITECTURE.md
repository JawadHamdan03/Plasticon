# Backend Architecture

## Overview

The backend is a **Node.js + Express + TypeScript** server. It uses **Prisma ORM** for database access, **Socket.IO** for real-time communication, **JWT** for authentication, and **node-cron** for scheduled tasks. The entry point is `src/app.ts`, which assembles every piece of the system before the server listens.

---

## Entry Point — `src/app.ts`

### Step 1 — Environment & Config

```
dotenv.config()  →  reads .env file (JWT_SECRET, DATABASE_URL, FRONTEND_ORIGIN, etc.)
PORT             →  process.env.PORT || 8080
```

### Step 2 — CORS Origins

Allowed origins are assembled from two sources:
- Hard-coded defaults: `localhost:5173`, `localhost:5174`, `localhost:8081`, `localhost:19006`
- `FRONTEND_ORIGIN` environment variable (comma-separated list)

Both lists are merged into one unique set. Any request from an origin outside this set is rejected with a CORS error.

### Step 3 — Middleware Stack (applied in order)

| Middleware | Purpose |
|---|---|
| `helmet()` | Sets security headers (CSP disabled to allow inline styles) |
| `cors(corsOptions)` | Enforces origin whitelist, allows credentials |
| `cookieParser()` | Parses `authToken` httpOnly cookie used by the auth system |
| `express.json({ limit: "2mb" })` | Parses JSON request bodies |
| `express.urlencoded()` | Parses form-encoded bodies |
| `/pictures` static | Serves uploaded files from `prisma/pictures/` with cross-origin headers |
| `authRateLimit` on `/auth` | 20 requests per 15-minute window to prevent brute-force |

### Step 4 — Route Registration

All 45+ route modules are mounted on named prefixes:

```
/auth                 → authRoutes
/registration-requests→ registrationRequestRoutes
/users                → userRoutes
/production           → productionRoutes
/maintenance          → maintenanceRoutes
/quality-checks       → qualityRoutes
/chat                 → chatRoutes
/notifications        → notificationRoutes
/shifts               → shiftsRoutes
/machines             → machinesRoutes
/dashboard            → dashboardRoutes
/financial            → financialRoutes
/expenses             → expenseRoutes
/payroll              → payrollRoutes
/attendance           → attendanceRoutes
... (45 total, see app.ts for full list)
```

Every route file imports `authorizeRoles()` from `authMiddleware.ts` and declares which roles are allowed on each endpoint.

### Step 5 — Global Error Handler

A four-argument Express middleware at the bottom of the file catches any unhandled errors from routes or middleware (including multer upload errors) and returns a JSON response with the correct HTTP status code.

### Step 6 — HTTP Server + Socket.IO

```
const server = createServer(app);   // wrap Express in Node HTTP server
initializeSocketServer(server);     // mount Socket.IO on the same server
```

Socket.IO uses the same port as REST so no extra firewall rules are needed. See `REALTIME_CHAT_NOTIFICATIONS.md` for full Socket.IO details.

### Step 7 — Server Start + Services

```
server.listen(PORT, () => {
  startNotificationScheduler();  // starts cron jobs
});
initializeEmailService();         // verifies SMTP config on startup
```

If the port is already in use, the server automatically retries once after 1 second before giving up.

---

## Request Lifecycle (REST)

```
Client request
  → CORS check
  → Cookie / JSON parsing
  → Rate limit check (auth routes only)
  → Route match (e.g. POST /production)
  → authorizeRoles([...]) middleware
      → extract JWT from cookie or Authorization header
      → verify JWT signature
      → look up user in DB
      → check user.role ∈ allowedRoles
  → Controller function
      → calls Service function
      → Service calls Prisma
      → Service may call auditHelper, emitNotification, sendPush
  → JSON response sent
```

---

## Folder Structure

```
Backend/
├── src/
│   ├── app.ts                  Entry point
│   ├── middleware/
│   │   └── authMiddleware.ts   JWT auth + role guard
│   ├── config/
│   │   ├── socket.ts           Socket.IO server
│   │   └── lib/prisma.ts       Prisma singleton
│   ├── controllers/            Request handlers (45+)
│   ├── routes/                 Express Router instances (45+)
│   ├── services/               Business logic + DB queries (50+)
│   └── utils/
│       ├── authServices.ts     JWT helpers
│       ├── emailService.ts     Nodemailer SMTP
│       └── uploadHandler.ts    Multer config for file uploads
├── prisma/
│   ├── schema.prisma           Database schema (57 models)
│   └── pictures/               Uploaded files served statically
├── scripts/                    Admin/maintenance scripts
└── tests/                      Jest test suites
```

---

## Controllers → Routes → Services Pattern

Every feature follows the same three-layer pattern:

```
Route file          Declares HTTP method + path + middleware + controller
Controller file     Validates request, calls service, sends response
Service file        All database logic via Prisma, calls helpers as needed
```

Example for Maintenance:
```
maintenanceRoutes.ts  →  POST /  authorizeRoles([ENGINEER, ADMIN])  →  createMaintenance
maintenanceController.ts  →  req.body extraction  →  maintenanceServices.create()
maintenanceServices.ts    →  prisma.maintenance.create()  +  auditHelper.log()  +  emitNotification()
```

This strict separation means the controller never touches Prisma directly and the service never reads `req` or `res`.
