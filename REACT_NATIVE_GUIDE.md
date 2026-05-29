# Plasticon Mobile App — React Native Developer Guide

This document is a complete reference for converting the Plasticon web application into a React Native mobile app. The backend remains **unchanged** — same Express + Prisma + PostgreSQL + Socket.IO server, same REST API endpoints, same auth cookies. You are only rebuilding the UI layer.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Domain](#2-business-domain)
3. [Tech Stack (Web → Mobile Mapping)](#3-tech-stack-web--mobile-mapping)
4. [Authentication & Session](#4-authentication--session)
5. [API Architecture](#5-api-architecture)
6. [User Roles & Navigation](#6-user-roles--navigation)
7. [Shared Pages (All Roles)](#7-shared-pages-all-roles)
8. [Worker Pages](#8-worker-pages)
9. [Engineer Pages](#9-engineer-pages)
10. [Accountant Pages](#10-accountant-pages)
11. [Admin Pages](#11-admin-pages)
12. [Real-Time (Socket.IO)](#12-real-time-socketio)
13. [File Uploads](#13-file-uploads)
14. [Data Models Reference](#14-data-models-reference)

---

## 1. Project Overview

Plasticon is a **factory management system** for a plastics manufacturer. It manages production, payroll, attendance, inventory, sales, purchases, maintenance, quality, and finance across four user roles.

- **Backend:** Express + TypeScript + Prisma + PostgreSQL
- **Real-time:** Socket.IO (chat, notifications)
- **Auth:** httpOnly cookie (`authToken`) — JWT, 7-day expiry
- **API base:** `http://localhost:8080` (env: `VITE_API_BASE_URL`)
- **File storage:** Server-side (`/uploads/...` paths returned in responses)

---

## 2. Business Domain

### Products

| Product      | Machine Line        | Raw Materials     |
| ------------ | ------------------- | ----------------- |
| **Caps**     | Caps Line 428sp     | HDPE, LDPE, COLOR |
| **Preforms** | Preform Line 430pet | PET, COLOR        |

### Raw Materials

- `HDPE` — bags, 25 kg/bag
- `LDPE` — bags, 25 kg/bag
- `PET` — bags, 22–30 kg/bag
- `ADHESIVE` — kg
- `EMPTY_BAGS` — pieces
- `COLOR` — kg
- `Preform (PET)` — finished goods (id=7)
- `Caps` — finished goods (id=8)

### User Roles

| Role         | Scope                                                  |
| ------------ | ------------------------------------------------------ |
| `ADMIN`      | Full access — manages users, all data, system settings |
| `ENGINEER`   | Machines, maintenance, quality, production, inventory  |
| `ACCOUNTANT` | Finance, invoices, payroll view, expenses, budgets     |
| `WORKER`     | Production records, attendance, daily tools            |

---

## 3. Tech Stack (Web → Mobile Mapping)

| Web (React)                               | React Native Equivalent                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| React Router DOM routes                   | React Navigation (Stack + Bottom Tabs)                       |
| CSS Grid / Flexbox                        | `StyleSheet` with `flex`, `flexWrap`                         |
| `fetch()` with `credentials: include`     | `fetch()` with cookie jar (react-native-cookies)             |
| `localStorage`                            | `AsyncStorage` (`@react-native-async-storage/async-storage`) |
| `<input type="file">`                     | `react-native-document-picker` or `expo-image-picker`        |
| Socket.IO client (browser)                | `socket.io-client` (same package, works in RN)               |
| Tailwind CSS / CSS variables              | NativeWind or plain `StyleSheet`                             |
| `window.confirm()` dialogs                | `Alert.alert()`                                              |
| `toast()` notifications                   | `react-native-toast-message` or similar                      |
| Date pickers (HTML `<input type="date">`) | `@react-native-community/datetimepicker`                     |

---

## 4. Authentication & Session

### Cookie-Based JWT

The backend sets an **httpOnly cookie** named `authToken` on login. All subsequent requests must send this cookie. In React Native you need a cookie jar.

**Recommended:** `react-native-cookies` (`@react-native-cookies/cookies`) or `rn-fetch-blob` + manual cookie header management.

### Login Flow

```
POST /auth/login
Body: { email: string, password: string }

Response (200):
{
  token: string,          // also set as httpOnly cookie "authToken"
  email: string,
  name: string,
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER",
  id: number,
  username: string,
  profileImage: string | null,
  profileCompleted: boolean
}
```

Store `token` and user object in `AsyncStorage`. Send `Authorization: Bearer {token}` header on every request (the web app uses httpOnly cookie, but the backend also accepts Bearer token).

### Logout

```
POST /auth/logout   (or just clear local storage and cookie)
```

Clear `AsyncStorage` and cookie jar.

### Refresh User Profile

```
GET /profile/me
Headers: Authorization: Bearer {token}

Response: Full UserProfile object (see Data Models)
```

### Registration (Admin-created or self-register)

```
POST /auth/register
Content-Type: multipart/form-data

Fields:
  nationalId: string
  fullName: string
  username: string
  email: string
  password: string
  role: string
  phone?: string
  shiftId?: string
  profileImage?: File (image)
```

### Password Reset Flow

```
POST /auth/forgot-password     Body: { email }
GET  /auth/verify-email        Query: ?token=...
POST /auth/reset-password      Body: { token, newPassword }
POST /auth/request-access      Body: { name, email, reason }
```

---

## 5. API Architecture

### Base URL

```
http://localhost:8080         (development)
https://your-production.com   (production — set via env)
```

### Request Pattern

Every request must include:

```javascript
headers: {
  'Content-Type': 'application/json',   // omit for FormData
  'Authorization': `Bearer ${token}`,
},
credentials: 'include',   // for cookie
```

### Error Response Shape

```typescript
{
  message: string;
} // or  { error: string }
```

### Pagination

Most list endpoints return plain arrays (no pagination wrapper). Filter by date range using query params where available:

```
?fromDate=2025-01-01&toDate=2025-01-31
?month=2025-01
?date=2025-01-15
```

---

## 6. User Roles & Navigation

### Recommended Navigation Structure (React Native)

Each role gets a **bottom tab navigator** with a **drawer or stack** for sub-pages.

#### WORKER Bottom Tabs

1. Dashboard
2. Work Hub (WorkerHubPage)
3. Production
4. Attendance
5. Chat

#### ENGINEER Bottom Tabs

1. Dashboard
2. Production
3. Maintenance
4. Quality
5. Inventory
6. Chat

#### ACCOUNTANT Bottom Tabs

1. Dashboard
2. Finance
3. Payroll / HR
4. Reports
5. Chat

#### ADMIN Bottom Tabs

1. Dashboard
2. Users / Management
3. Operations
4. Finance
5. System

---

## 7. Shared Pages (All Roles)

---

### 7.1 Login Page

**Route:** `/login`  
**Access:** Public

**Features:**

- Email + password login
- Link to forgot password
- Link to register

**API:**

```
POST /auth/login
Body: { email, password }
```

---

### 7.2 Register Page

**Route:** `/register`  
**Access:** Public

**Features:**

- Full registration form with profile photo upload
- Shift selection (for WORKER/ENGINEER)
- After registration, account awaits admin activation

**API:**

```
GET  /shifts             → Shift[]   (to populate shift picker)
POST /auth/register      multipart/form-data
```

---

### 7.3 Dashboard Page

**Route:** `/dashboard`  
**Access:** All roles (content differs per role)

**Features:**

- Quick stats cards (role-specific)
- ADMIN: total users, machines, production today, low-stock alerts
- ENGINEER/WORKER: personal production records, attendance status
- ACCOUNTANT: financial metrics preview
- Unread notification count badge

**API:**

```
GET /dashboard/analytics          → AdminAnalytics   (ADMIN only)
GET /dashboard/stats              → QuickStats        (ADMIN only)
GET /notifications/unread-count   → { unreadCount: number }
GET /production/me                → ProductionItem[]
GET /attendance/me                → AttendanceRecord[]
GET /payroll/me                   → PayrollRecord[]
GET /inventory/transactions/all   → InvTx[]           (ADMIN/ACCOUNTANT)
```

**Data:**

```typescript
type AdminAnalytics = {
  totalUsers: number;
  activeUsers: number;
  totalMachines: number;
  operationalMachines: number;
  productionToday: number;
  lowStockItems: number;
};
```

---

### 7.4 Profile Page

**Route:** `/profile`  
**Access:** All roles

**Features:**

- View and edit personal profile
- Upload profile photo
- Change password
- View uploaded documents

**API:**

```
GET    /profile/me                    → UserProfile
PUT    /profile/me   (multipart/form-data)
  Fields: fullName, bio, jobTitle, department, dateOfBirth,
          address, phone, linkedIn, skills, profileImage (file)
POST   /profile/change-password
  Body: { currentPassword, newPassword }
GET    /profile/documents             → UserDocument[]
POST   /profile/documents  (multipart/form-data)
  Fields: file, documentType, title
DELETE /profile/documents/{id}
```

---

### 7.5 My Attendance Page

**Route:** `/attendance`  
**Access:** All roles

**Features:**

- Check-in / Check-out buttons (live clock)
- Monthly attendance history table
- Shows late minutes, overtime minutes, shift info
- Open attendance record (checked in, not yet out) highlighted

**API:**

```
GET  /attendance/me          → AttendanceRecord[]
POST /attendance/check-in    → AttendanceRecord
POST /attendance/check-out   → AttendanceRecord
```

**Data:**

```typescript
type AttendanceRecord = {
  id: number;
  checkIn: string; // ISO datetime
  checkOut: string | null; // null = still checked in
  lateMinutes: number;
  overtimeMinutes: number;
  shift?: { id: number; name: string } | null;
};
```

**Mobile Note:** Show a large check-in/out button prominently. Display live timer if currently checked in.

---

### 7.6 My Payroll Page

**Route:** `/my-payroll`  
**Access:** All roles

**Features:**

- Tab: Daily payroll records (per attendance day)
- Tab: Monthly payroll summaries
- Month picker filter
- Shows confirmed vs pending status

**API:**

```
GET /payroll/daily/me?month=YYYY-MM   → { records: DailyRecord[], confirmedTotal: number }
GET /payroll/me                        → MonthlyPayroll[]
```

**Data:**

```typescript
type DailyRecord = {
  id: number;
  date: string;
  hoursWorked: number;
  dailyRate: number;
  totalDailyPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
  leaveType: string | null;
  attendance?: { checkIn: string; checkOut: string | null } | null;
};

type MonthlyPayroll = {
  id: number;
  month: string;
  totalSalary: number;
  baseSalary?: number;
  overtimeSalary?: number;
  totalHours?: number;
};
```

---

### 7.7 Notifications Page

**Route:** `/notifications`  
**Access:** All roles

**Features:**

- List of system notifications (payroll confirmed, alerts, messages)
- Mark all as read
- Unread count badge

**API:**

```
GET   /notifications              → Notification[]
PATCH /notifications/mark-all-read
```

**Data:**

```typescript
type Notification = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
};
```

---

### 7.8 Chat Page

**Route:** `/chat`  
**Access:** All roles

**Features:**

- Group chat (join / leave groups)
- Direct messaging to shift members
- Admin broadcast messaging (to all, by shift, by audience)
- Real-time via Socket.IO
- Unread message badges per group

**API (REST):**

```
GET    /chat/groups                          → ChatGroup[]
GET    /chat/groups/{id}                     → ChatGroupDetail
GET    /chat/groups/{id}/messages            → { messages: GroupMessage[] }
POST   /chat/groups/{id}/messages            Body: { content }
PATCH  /chat/groups/{id}/mark-as-read
POST   /chat/groups                          Body: { name, description? }
POST   /chat/groups/{id}/members             Body: { userId }
DELETE /chat/groups/{id}/members/{userId}
GET    /chat/admin/targets                   → AdminTargets   (ADMIN only)
POST   /chat/admin/send                      Body: { content, targetType, targetUserId?, shiftId?, audienceKey? }
POST   /chat/direct                          Body: { content, targetType, targetUserId?, shiftId?, audienceKey? }
GET    /chat/members-by-shift                → ShiftMembersBucket[]
```

**Socket.IO Events (see Section 12):**

```
join_group          emit: { groupId }
leave_group         emit: { groupId }
send_message        emit: { groupId, content }
new_message         on:  { groupId, message: GroupMessage }
```

**Data:**

```typescript
type ChatGroup = {
  id: number;
  name: string;
  description?: string;
  unreadCount?: number;
  lastMessage?: { id: number; content: string; createdAt: string };
};

type GroupMessage = {
  id: number;
  content: string;
  createdAt: string;
  sender?: { id: number; fullName?: string; username?: string; role?: string };
};
```

---

### 7.9 Production Page

**Route:** `/production`  
**Access:** All roles

**Features:**

- Log production runs (Caps or Preform line)
- Filter by date range
- ADMIN/ENGINEER see all users' records
- WORKER sees own records only
- Preform entry: boxes with cavities × cycles
- Caps entry: carton count

**API:**

```
GET  /machines                          → Machine[]
GET  /shifts                            → Shift[]
GET  /production/me                     → ProductionItem[]   (own records)
GET  /production/all                    → ProductionItem[]   (admin/engineer)
GET  /production/admin/overview?fromDate=&toDate=   → AdminOverview
POST /production   Body: see below
```

**POST body for Preform:**

```json
{
  "machineId": 1,
  "shiftId": 2,
  "boxes": [{ "cavities": 96, "cycles": 1000, "numberOfBoxes": 10 }],
  "notes": "..."
}
```

**POST body for Caps:**

```json
{
  "machineId": 2,
  "shiftId": 1,
  "cartonsCount": 50,
  "notes": "..."
}
```

---

### 7.10 Consumption Page

**Route:** `/consumption`  
**Access:** All roles

**Features:**

- Log raw material usage per shift (HDPE, LDPE, PET, COLOR, ADHESIVE, EMPTY_BAGS)
- Optional document attachment
- Date range filter
- Admin sees all; worker sees own

**API:**

```
GET  /shifts               → Shift[]
GET  /production/me        → ConsumptionRecord[]
GET  /production/all       → ConsumptionRecord[]  (admin)
POST /production           multipart/form-data
  Fields: shiftId, rawHdpeUsed?, rawLdpeUsed?, rawPetUsed?,
          colorUsed?, adhesiveUsed?, emptyBagsUsed?, notes?, document (file)
```

---

### 7.11 Warehouse Page

**Route:** `/warehouse`  
**Access:** ADMIN, ACCOUNTANT, ENGINEER

**Features:**

- Real-time raw material stock levels (from inventory)
- Finished goods stock (calculated: production − sales)
- Color-coded stock indicators (green=ok, yellow=low, red=critical)
- Material category breakdown

**API:**

```
GET /inventory/materials    → RawMaterial[]
GET /production/all         → ProductionRecord[]
GET /sales/all              → SaleRecord[]
```

**Calculation:**

- Finished Caps stock = total caps produced − total caps sold
- Finished Preform stock = total preforms produced − total preforms sold

---

### 7.12 Inventory Stock Page

**Route:** `/inventory`  
**Access:** ADMIN, ACCOUNTANT, ENGINEER

**Features:**

- Raw material inventory ledger
- Add stock (incoming material)
- Adjust stock manually
- Transaction history

**API:**

```
GET  /inventory/materials                → RawMaterial[]
GET  /inventory/transactions/all         → InventoryTransaction[]
POST /inventory/add                      Body: { materialId, quantity, notes? }
POST /inventory/adjust                   Body: { materialId, quantity, reason }
```

---

### 7.13 Sales Page

**Route:** `/sales`  
**Access:** ADMIN, ACCOUNTANT, ENGINEER

**Features:**

- Sales records with multi-item line items
- Customer selection (autocomplete)
- Invoice file attachment (PDF/image)
- Download delivery note as PDF
- CRUD operations

**API:**

```
GET    /sales/customers          → CustomerOption[]
GET    /sales/all                → SaleRecord[]
POST   /sales    multipart/form-data
  Fields: customerName, date?, totalAmount?, items (JSON string), invoiceFile (file)
PUT    /sales/{id}    multipart/form-data
DELETE /sales/{id}
```

**Data:**

```typescript
type SaleRecord = {
  id: number;
  date: string;
  totalAmount: number;
  customer?: { id: number; name: string; phone?: string; email?: string };
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
};

type SaleItem = {
  machineType: string; // "CAPS" | "PREFORM"
  size: string;
  quantity: number;
  pricePerUnit: number;
};
```

---

### 7.14 Suppliers / Purchases Page

**Route:** `/purchases`  
**Access:** ADMIN, ACCOUNTANT, ENGINEER

**Features:**

- Purchase records grouped by supplier (ledger view)
- Multi-item purchases (per raw material)
- Invoice attachment
- Supplier contact info
- Search and filter

**API:**

```
GET    /inventory/materials        → RawMaterial[]
GET    /purchases/suppliers        → SupplierOption[]
GET    /purchases/all              → PurchaseRecord[]
POST   /purchases    multipart/form-data
  Fields: supplierName, date?, totalAmount, items (JSON), invoiceFile (file)
PUT    /purchases/{id}    multipart/form-data
DELETE /purchases/{id}
```

---

### 7.15 Reports Page

**Route:** `/reports`  
**Access:** ADMIN, ACCOUNTANT, ENGINEER

**Features:**

- Production summary report (date range)
- Quality checks summary
- Attendance summary
- Machine utilization
- Export options

**API:**

```
GET /production/all                              → ProductionRecord[]
GET /quality-checks/all                          → QualityCheck[]
GET /attendance/all?fromDate=&toDate=            → AttendanceRecord[]
GET /machines                                    → Machine[]
GET /reports/production?fromDate=&toDate=        → ProductionReport
```

---

### 7.16 Electricity Page

**Route:** `/electricity`  
**Access:** WORKER, ENGINEER, ADMIN

**Features:**

- Record electricity meter readings per shift
- Auto-calculates consumption (kWh) and cost
- Handles meter reset (counter rollover)
- Date/shift filter
- ADMIN can edit and delete records

**API:**

```
GET    /shifts                                    → Shift[]
GET    /electricity/kwh-price                     → KwhPrice | null
GET    /electricity/readings?fromDate=&toDate=&shiftId=   → ElectricityReading[]
GET    /users/all                                 → User[]   (admin only, for engineer assignment)
POST   /electricity/readings
  Body: { date, shiftId, startReading, endReading, isMeterReset, maxMeterValue?, notes?, responsibleEngineerId? }
PATCH  /electricity/readings/{id}    Body: same fields
DELETE /electricity/readings/{id}
```

**Data:**

```typescript
type ElectricityReading = {
  id: number;
  date: string;
  shift: { id: number; name: string };
  startReading: number;
  endReading: number;
  isMeterReset: boolean;
  maxMeterValue?: number | null;
  consumption: number; // calculated by backend
  kwhPriceSnap: number;
  shiftCost: number;
  notes?: string | null;
  recordedBy: { fullName: string; username: string };
  responsibleEngineer?: { fullName: string; username: string } | null;
};
```

---

## 8. Worker Pages

---

### 8.1 Worker Hub

**Route:** `/worker/hub`  
**Access:** WORKER only

**Features:**

- Aggregated dashboard of ALL worker data in one screen
- Tabs: Attendance, Daily Pay, Monthly Pay, Production, Snapshots, Machine Stops, Checklist, Waste, Targets, Kaizen, Quality Issues, Micro-Stops, Anomaly Alerts

**API (all GET, all suffixed with `/mine`):**

```
GET /attendance/me
GET /payroll/daily/me
GET /payroll/me
GET /production/me
GET /settings/snapshots/mine?limit=50
GET /worker-tools/machine-stop-alerts/mine
GET /worker-tools/shift-checklists/mine
GET /worker-tools/material-waste/mine
GET /worker-tools/daily-targets/mine
GET /worker-tools/kaizen/mine
GET /worker-tools/quality-issues/mine
GET /worker-tools/micro-stops/mine
GET /worker-tools/electricity-anomaly-alerts/mine
```

---

### 8.2 Worker Snapshots (Machine Readings)

**Route:** `/worker/snapshots`  
**Access:** WORKER

**Features:**

- Submit machine counter + electricity kWh readings with photos
- History with date filter
- Edit and delete own entries

**API:**

```
GET    /settings/snapshots/mine?limit=200&from=&to=   → WorkerSnapshot[]
POST   /settings/snapshots    multipart/form-data
  Fields: machineLabel, machineCounter, electricityKwh, notes?,
          machineCounterImage (file), electricityImage (file)
PUT    /settings/snapshots/{id}    multipart/form-data
DELETE /settings/snapshots/{id}
```

**Data:**

```typescript
type WorkerSnapshot = {
  id: number;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes?: string | null;
  machineCounterImage?: string | null; // file path
  electricityImage?: string | null;
  createdAt: string;
};
```

---

### 8.3 Worker Tools

**Route:** `/worker/tools`  
**Access:** WORKER

Multiple sub-tools, each with its own submit form and history list:

#### Machine Stop Alerts

```
GET  /worker-tools/machine-stop-alerts/mine
POST /worker-tools/machine-stop-alerts
  Body: { machineLabel, priority: "CRITICAL"|"HIGH"|"NORMAL", reason }
PATCH /worker-tools/machine-stop-alerts/{id}/resolve
DELETE /worker-tools/entries/machine-stop-alerts/{id}
```

#### Shift Checklist

```
GET  /worker-tools/shift-checklists/mine
POST /worker-tools/shift-checklists
  Body: { shiftPhase: "START"|"END", tasks: [{ label, done }], digitalSignature }
```

#### Material Waste Log

```
GET  /worker-tools/material-waste/mine
POST /worker-tools/material-waste
  Body: { machineLabel, machineType, materialType, wasteKg: number, reason }
```

#### Daily Targets

```
GET  /worker-tools/daily-targets/mine
POST /worker-tools/daily-targets
  Body: { targetDate, targetUnits: number, actualUnits: number, note? }
```

#### Kaizen Ideas

```
GET  /worker-tools/kaizen/mine
POST /worker-tools/kaizen
  Body: { title, details, estimatedImpact }
```

#### Quality Issues

```
GET  /worker-tools/quality-issues/mine
POST /worker-tools/quality-issues    multipart/form-data
  Fields: batchCode, machineLabel, issueType, details, issueImage (file)
```

#### Micro-Stops

```
GET  /worker-tools/micro-stops/mine
POST /worker-tools/micro-stops
  Body: { machineLabel, reason, durationMinutes: number }
```

#### Electricity Anomaly Alerts

```
GET  /worker-tools/electricity-anomaly-alerts/mine
POST /worker-tools/electricity-anomaly-alerts
  Body: { machineLabel, currentKwh: number, thresholdRatio: number }  // thresholdRatio default 1.3
```

#### Delete Any Tool Entry

```
DELETE /worker-tools/entries/{toolTab}/{entryId}
  toolTab: "machine-stop-alerts" | "shift-checklists" | "material-waste" |
           "daily-targets" | "kaizen" | "quality-issues" | "micro-stops" |
           "electricity-anomaly-alerts"
```

---

## 9. Engineer Pages

---

### 9.1 Engineer Inventory

**Route:** `/engineer/inventory`  
**Access:** ENGINEER, ADMIN

**Features:**

- View and manage parts/materials stock specific to engineering
- Add/adjust quantities
- Transaction history

**API:**

```
GET  /engineer-inventory/items            → EngineerInventoryItem[]
GET  /engineer-inventory/transactions     → EngineerTransaction[]
POST /engineer-inventory/items            Body: { name, quantity, unit, minQuantity? }
PUT  /engineer-inventory/items/{id}       Body: { name?, quantity?, unit?, minQuantity? }
POST /engineer-inventory/adjust           Body: { itemId, adjustment, reason }
DELETE /engineer-inventory/items/{id}
```

---

### 9.2 Maintenance Page

**Route:** `/maintenance`  
**Access:** ENGINEER, WORKER, ADMIN

**Features:**

- Log maintenance events (breakdown, scheduled, preventive)
- Assign to machine
- Track resolution status
- CRUD

**API:**

```
GET    /machines                          → Machine[]
GET    /maintenance                       → MaintenanceRecord[]
POST   /maintenance
  Body: { machineId, type, description, startDate, endDate?, cost?, technician? }
PUT    /maintenance/{id}    Body: same fields
DELETE /maintenance/{id}
```

**Data:**

```typescript
type MaintenanceRecord = {
  id: number;
  machineId: number;
  machine?: { id: number; name: string; type: string };
  type: string; // "BREAKDOWN" | "SCHEDULED" | "PREVENTIVE"
  description: string;
  startDate: string;
  endDate?: string | null;
  cost?: number | null;
  technician?: string | null;
  status: string;
  createdAt: string;
};
```

---

### 9.3 Quality Checks

**Route:** `/quality-checks`  
**Access:** ENGINEER, ADMIN

**Features:**

- Record quality inspection results per batch
- Pass/fail/partial status
- Machine and date filters
- CRUD

**API:**

```
GET    /quality-checks/all           → QualityCheck[]
POST   /quality-checks
  Body: { machineId, batchCode, checkType, result, notes?, date }
PUT    /quality-checks/{id}    Body: same fields
DELETE /quality-checks/{id}
```

**Data:**

```typescript
type QualityCheck = {
  id: number;
  machineId: number;
  machine?: { id: number; name: string };
  batchCode: string;
  checkType: string;
  result: "PASS" | "FAIL" | "PARTIAL";
  notes?: string | null;
  date: string;
  createdBy?: { fullName: string };
};
```

---

### 9.4 Machine Health Dashboard

**Route:** `/engineer/machines`  
**Access:** ENGINEER, ADMIN

**Features:**

- Machine status overview (OPERATIONAL, UNDER_MAINTENANCE, BROKEN, OFFLINE)
- Health metrics per machine
- Alert history

**API:**

```
GET /machines                          → Machine[]
GET /machine-health                    → MachineHealth[]
GET /machine-health/{machineId}        → MachineHealthDetail
POST /machine-health
  Body: { machineId, metric, value, notes? }
```

---

### 9.5 Preventive Maintenance Schedule

**Route:** `/engineer/maintenance-schedule`  
**Access:** ENGINEER, ADMIN

**Features:**

- Scheduled maintenance calendar
- Create/edit/delete schedules
- Assign to machine, set frequency (daily, weekly, monthly)
- Mark as completed

**API:**

```
GET    /maintenance-schedules             → MaintenanceSchedule[]
POST   /maintenance-schedules
  Body: { machineId, title, frequency, nextDueDate, notes? }
PUT    /maintenance-schedules/{id}
  Body: { title?, frequency?, nextDueDate?, completedAt?, notes? }
DELETE /maintenance-schedules/{id}
```

---

### 9.6 Spare Parts Management

**Route:** `/engineer/spare-parts`  
**Access:** ENGINEER, ADMIN

**Features:**

- Spare parts inventory
- Request spare parts
- Track stock levels and reorder points

**API:**

```
GET    /spare-parts                      → SparePart[]
POST   /spare-parts
  Body: { name, partNumber?, quantity, unit, minQuantity, cost? }
PUT    /spare-parts/{id}    Body: same fields
DELETE /spare-parts/{id}
GET    /spare-part-requests              → SparePartRequest[]
POST   /spare-part-requests
  Body: { sparePartId, quantityRequested, urgency, notes? }
PATCH  /spare-part-requests/{id}/approve
PATCH  /spare-part-requests/{id}/reject
```

---

### 9.7 Equipment Lifecycle Tracking

**Route:** `/engineer/equipment-lifecycle`  
**Access:** ENGINEER, ADMIN

**Features:**

- Track equipment purchase date, warranty, expected replacement
- Lifecycle status

**API:**

```
GET    /machine-health/lifecycle         → EquipmentLifecycle[]
POST   /machine-health/lifecycle
  Body: { machineId, purchaseDate, warrantyExpiry, expectedReplacement, notes? }
PUT    /machine-health/lifecycle/{id}
DELETE /machine-health/lifecycle/{id}
```

---

### 9.8 Production Analytics

**Route:** `/engineer/production-analytics`  
**Access:** ENGINEER, ADMIN

**Features:**

- Charts: production volume over time, per machine, per shift
- Efficiency metrics
- Comparison across periods

**API:**

```
GET /production/all?fromDate=&toDate=    → ProductionRecord[]
GET /production/admin/overview?fromDate=&toDate=   → AdminOverview
GET /machines                            → Machine[]
GET /shifts                              → Shift[]
```

---

### 9.9 Quality Trend Reports

**Route:** `/engineer/quality-trends`  
**Access:** ENGINEER, ADMIN

**Features:**

- Quality pass/fail trend charts
- Filter by machine, date range, check type

**API:**

```
GET /quality-checks/all?fromDate=&toDate=&machineId=   → QualityCheck[]
GET /machines                                           → Machine[]
```

---

### 9.10 Technical Documentation

**Route:** `/engineer/documentation`  
**Access:** ENGINEER, ADMIN

**Features:**

- Upload and manage technical documents (PDFs, images)
- Tag by machine or category
- Search and download

**API:**

```
GET    /tech-documents                   → TechDocument[]
POST   /tech-documents    multipart/form-data
  Fields: title, category, machineId?, document (file)
DELETE /tech-documents/{id}
```

---

### 9.11 Equipment Calibration

**Route:** `/engineer/calibration`  
**Access:** ENGINEER, ADMIN

**Features:**

- Log calibration events per machine
- Set next calibration date
- Calibration status tracking

**API:**

```
GET    /machine-health/calibrations      → Calibration[]
POST   /machine-health/calibrations
  Body: { machineId, calibratedAt, nextCalibrationDue, notes?, result }
PUT    /machine-health/calibrations/{id}
DELETE /machine-health/calibrations/{id}
```

---

### 9.12 Work Orders

**Route:** `/engineer/work-orders`  
**Access:** ENGINEER, ADMIN

**Features:**

- Create and track work orders
- Assign to technician
- Priority (HIGH, MEDIUM, LOW)
- Status (OPEN, IN_PROGRESS, DONE)

**API:**

```
GET    /maintenance/work-orders          → WorkOrder[]
POST   /maintenance/work-orders
  Body: { machineId, title, description, priority, assignedTo? }
PUT    /maintenance/work-orders/{id}
  Body: { title?, description?, priority?, status?, assignedTo? }
DELETE /maintenance/work-orders/{id}
```

---

### 9.13 Equipment Transfer Log

**Route:** `/engineer/equipment-transfer`  
**Access:** ENGINEER, ADMIN

**Features:**

- Log equipment movement between locations
- Transfer history

**API:**

```
GET    /machine-health/transfers         → EquipmentTransfer[]
POST   /machine-health/transfers
  Body: { machineId, fromLocation, toLocation, transferDate, notes? }
DELETE /machine-health/transfers/{id}
```

---

### 9.14 Raw Material Alerts

**Route:** `/engineer/raw-material-alerts`  
**Access:** ENGINEER, ADMIN

**Features:**

- Alerts for low-stock raw materials
- Threshold configuration per material
- Alert history

**API:**

```
GET  /raw-material-alerts             → RawMaterialAlert[]
POST /raw-material-alerts/check       Body: { materialId }
PUT  /raw-material-alerts/{id}/resolve
GET  /inventory/materials             → RawMaterial[]   (for thresholds)
```

---

### 9.15 Maintenance Costs

**Route:** `/engineer/maintenance-costs`  
**Access:** ENGINEER, ACCOUNTANT, ADMIN

**Features:**

- Cost tracking per maintenance event
- Totals by machine and date range
- Cost breakdown charts

**API:**

```
GET /maintenance-costs             → MaintenanceCost[]
GET /maintenance-costs/summary     → MaintenanceCostSummary
GET /machines                      → Machine[]
POST /maintenance-costs
  Body: { machineId, amount, category, date, description?, maintenanceId? }
DELETE /maintenance-costs/{id}
```

---

## 10. Accountant Pages

---

### 10.1 Financial Dashboard

**Route:** `/accountant/financial-dashboard`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- KPI cards: revenue, expenses, profit, cash balance
- Cost breakdown (raw materials, electricity, salaries)
- Progress vs targets
- Set financial targets

**API:**

```
GET /financial/dashboard         → DashboardData
PUT /financial/settings
  Body: { revenueTarget, expenseLimit, profitMarginTarget }
```

**Data:**

```typescript
type DashboardData = {
  revenue: number;
  paidRevenue: number;
  expenses: number;
  approvedExpenses: number;
  profit: number;
  profitMargin: number;
  cashBalance: number;
  salesRevenue: number;
  rawMaterialCost: number;
  electricityCost: number;
  salaryCost: number;
  netProfit: number;
  netProfitMargin: number;
  targets: {
    revenueTarget: number;
    expenseLimit: number;
    profitMarginTarget: number;
  };
};
```

---

### 10.2 Expense Tracking

**Route:** `/accountant/expenses`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Submit expenses by category
- Approval workflow (PENDING → APPROVED)
- Delete pending expenses
- Filter by category and status

**Categories:** RAW_MATERIALS, UTILITIES, MAINTENANCE, SALARIES, TRANSPORT, PACKAGING, SUPPLIES, ADMIN, OTHER

**API:**

```
GET   /expenses                      → Expense[]
POST  /expenses    Body: { category, amount, description? }
PATCH /expenses/{id}/approve         Body: { paymentStatus: "APPROVED" }
DELETE /expenses/{id}
```

**Data:**

```typescript
type Expense = {
  id: number;
  category: string;
  amount: number;
  description?: string;
  paymentStatus: "PENDING" | "APPROVED";
  submittedAt: string;
  approvedAt?: string;
  submittedBy?: { fullName: string };
  approvedBy?: { fullName: string };
};
```

---

### 10.3 Invoice Management

**Route:** `/accountant/invoices`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Create invoices for customers
- Track payment status (PENDING, PAID, OVERDUE)
- Record payments
- Overdue detection (past due date, unpaid)

**API:**

```
GET   /invoices                         → Invoice[]
POST  /invoices
  Body: { customerName, invoiceNumber, totalAmount, dueDate }
PATCH /invoices/{id}/payment    Body: { paymentStatus: "PAID" }
DELETE /invoices/{id}
```

**Data:**

```typescript
type Invoice = {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  paymentStatus: "PENDING" | "PAID" | "OVERDUE";
  customer?: { name: string; email: string; phone: string };
  createdAt: string;
};
```

---

### 10.4 Financial Reports

**Route:** `/accountant/financial-reports`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Profit & loss report
- Cash flow statement
- Revenue vs expense trend charts
- Date range filter
- Export to PDF

**API:**

```
GET /financial-reports/pl?fromDate=&toDate=      → PLReport
GET /financial-reports/cashflow?month=           → CashflowReport
GET /financial-reports/summary                   → FinancialSummary
```

---

### 10.5 Supplier Payables

**Route:** `/accountant/payables`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Track amounts owed to suppliers
- Payment status (PENDING, PAID, OVERDUE)
- Due date tracking and overdue alerts
- Notes per payable

**API:**

```
GET    /supplier-payables              → SupplierPayable[]
POST   /supplier-payables
  Body: { supplierName, amount, dueDate, paymentStatus, notes? }
PATCH  /supplier-payables/{id}    Body: same fields
DELETE /supplier-payables/{id}
```

---

### 10.6 Customer Receivables

**Route:** `/accountant/receivables`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Track amounts owed by customers
- Collection status (PENDING, COLLECTED, OVERDUE)
- Overdue detection
- Notes per receivable

**API:**

```
GET    /customer-receivables              → CustomerReceivable[]
POST   /customer-receivables
  Body: { customerName, amount, dueDate, status, notes? }
PATCH  /customer-receivables/{id}    Body: same fields
DELETE /customer-receivables/{id}
```

---

### 10.7 Budget Planning

**Route:** `/accountant/budgets`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Create department/category budgets
- Track allocated vs spent
- Budget period (monthly/annual)

**API:**

```
GET    /budget-plans               → BudgetPlan[]
POST   /budget-plans    Body: { category, period, allocatedAmount, notes? }
PUT    /budget-plans/{id}
DELETE /budget-plans/{id}
```

---

### 10.8 Tax Compliance

**Route:** `/accountant/tax`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Tax filing records
- Filing period and status tracking
- Tax amount tracking

**API:**

```
GET    /tax-filings              → TaxFiling[]
POST   /tax-filings    Body: { period, taxType, amount, dueDate, status, notes? }
PUT    /tax-filings/{id}
DELETE /tax-filings/{id}
```

---

### 10.9 Bank Reconciliation

**Route:** `/accountant/reconciliation`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Match bank transactions to accounting records
- Mark as reconciled
- Discrepancy tracking

**API:**

```
GET    /bank-reconciliation              → BankReconciliation[]
POST   /bank-reconciliation    Body: { date, bankAmount, bookAmount, description, status }
PUT    /bank-reconciliation/{id}
DELETE /bank-reconciliation/{id}
```

---

### 10.10 Cost Analysis

**Route:** `/accountant/cost-analysis`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Per-unit cost breakdown (raw material + electricity + labor)
- Cost trend over time
- Machine cost comparison

**API:**

```
GET /cost-analysis                       → CostAnalysis
GET /cost-analysis/breakdown?month=     → CostBreakdown
GET /machines                           → Machine[]
```

---

### 10.11 Approval Workflows

**Route:** `/accountant/approvals`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Pending approvals queue (expenses, purchases, requests)
- Approve or reject with notes
- Approval history

**API:**

```
GET   /approval-workflows/pending        → ApprovalItem[]
POST  /approval-workflows/{id}/approve   Body: { notes? }
POST  /approval-workflows/{id}/reject    Body: { notes }
GET   /approval-workflows/history        → ApprovalHistory[]
```

---

### 10.12 Supplier Management

**Route:** `/accountant/suppliers`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Supplier CRUD (name, contact, address)
- View purchase history per supplier
- Supplier ledger

**API:**

```
GET    /purchases/suppliers          → Supplier[]
POST   /purchases/suppliers    Body: { name, phone?, email?, address? }
PUT    /purchases/suppliers/{id}
DELETE /purchases/suppliers/{id}
```

---

### 10.13 Employee Performance

**Route:** `/accountant/performance`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Performance scores per employee
- Based on attendance, production, quality metrics
- Period-based summaries

**API:**

```
GET  /performance             → PerformanceRecord[]
GET  /performance/{userId}    → UserPerformance
GET  /users/all               → User[]
```

---

### 10.14 Parts Pricing

**Route:** `/accountant/parts-pricing`  
**Access:** ACCOUNTANT, ADMIN

**Features:**

- Set and manage product/spare-part prices
- Price history tracking

**API:**

```
GET    /spare-parts/pricing              → PartPrice[]
POST   /spare-parts/pricing    Body: { partId, price, effectiveDate }
PUT    /spare-parts/pricing/{id}
DELETE /spare-parts/pricing/{id}
```

---

## 11. Admin Pages

---

### 11.1 Admin Dashboard

**Route:** `/admin`  
**Access:** ADMIN only

**Features:**

- Summary of all system stats
- Links to management sections

**API:**

```
GET /dashboard/analytics     → AdminAnalytics
GET /dashboard/stats         → QuickStats
```

---

### 11.2 Users Management

**Route:** `/admin/users`  
**Access:** ADMIN only

**Features:**

- View all users with role and status
- Change user role
- Assign shift (WORKER/ENGINEER)
- Activate/deactivate users

**API:**

```
GET /users/all                          → AdminUser[]
GET /shifts                             → Shift[]
PUT /users/{id}    Body: { role, shiftId? }
```

**Data:**

```typescript
type AdminUser = {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  isActive: boolean;
  shiftId: number | null;
  shift: { id: number; name: string } | null;
};
```

---

### 11.3 Registration Requests

**Route:** `/admin/registration-requests`  
**Access:** ADMIN only

**Features:**

- View pending self-registration requests
- Approve (assigns role, creates account) or reject
- Notes on approval/rejection

**API:**

```
GET   /registration-requests              → RegistrationRequest[]
POST  /registration-requests/{id}/approve    Body: { role }
POST  /registration-requests/{id}/reject     Body: { reason? }
DELETE /registration-requests/{id}
```

---

### 11.4 Attendance Admin

**Route:** `/admin/attendance`  
**Access:** ADMIN, ACCOUNTANT

**Features:**

- Monthly attendance calendar per employee
- Create/edit/delete attendance records
- Late and overtime grace period settings
- Daily statistics

**API:**

```
GET  /users/all                                        → AdminUser[]
GET  /attendance/all?userId={id}&fromDate=&toDate=     → AttendanceRecord[]
GET  /attendance/settings                              → AttendanceSetting
PUT  /attendance/settings    Body: { lateGraceMinutes, overtimeGraceMinutes }
POST /attendance    Body: { userId, checkIn, checkOut?, notes? }
PUT  /attendance/{id}    Body: { checkIn?, checkOut?, notes? }
DELETE /attendance/{id}
```

---

### 11.5 Payroll Admin

**Route:** `/admin/payroll`  
**Access:** ADMIN, ACCOUNTANT

**Features:**

- **Daily tab:** Confirm daily payrolls, mark leave types, calculate for a date
- **Monthly tab:** Monthly payroll summary, calculate for all, edit/delete
- **Salary Config:** Set base monthly salary per role
- **User Salaries:** Override salary per individual user
- **Deduction Rules:** Configure rules for late arrival, early checkout, unexcused absence, sick leave

**API:**

```
GET  /payroll/daily?date=                              → DailyRecord[]
GET  /payroll/admin/overview?month=                    → PayrollOverview
GET  /payroll?month=                                   → MonthlyPayroll[]
POST /payroll/monthly/calculate    Body: { month }     → { calculated: number }
POST /payroll/daily/calculate-date    Body: { date }   → { calculated: number }
POST /payroll/daily/{id}/confirm
PATCH /payroll/admin/attendance/{attendanceId}/leave   Body: { leaveType }
GET  /payroll/salary-config                            → SalaryConfig[]
PUT  /payroll/salary-config    Body: { role, monthlySalary }
GET  /payroll/admin/user-salaries                      → UserSalary[]
PUT  /payroll/admin/user-salaries/{userId}    Body: { monthlySalary: number | null }
GET  /payroll/admin/deduction-rules            → DeductionRule[]
PUT  /payroll/admin/deduction-rules/{type}
  Body: { isActive?, thresholdMinutes?, deductionValue? }
PUT  /payroll/{id}    Body: { totalSalary }
DELETE /payroll/{id}
```

**Deduction Rule Types:** `LATE_ARRIVAL`, `EARLY_CHECKOUT`, `UNEXCUSED_ABSENCE`, `SICK_LEAVE`

**Leave Types:** `SICK`, `ANNUAL`, `EMERGENCY`, `UNPAID`, `EXCUSED`

---

### 11.6 Shifts Management

**Route:** `/admin/shifts`  
**Access:** ADMIN only

**Features:**

- View all shifts with times
- Edit shift name and time window
- Shifts are assigned to workers during registration

**API:**

```
GET /shifts              → Shift[]
PUT /shifts/{id}    Body: { name, startTime, endTime }
```

**Data:**

```typescript
type Shift = { id: number; name: string; startTime: string; endTime: string };
```

---

### 11.7 Machines Management

**Route:** `/admin/machines`  
**Access:** ADMIN only

**Features:**

- Machine CRUD
- Status management
- Machine type (CAPS, PREFORM, or other)

**API:**

```
GET    /machines                      → Machine[]
POST   /machines    Body: { name, type }
PUT    /machines/{id}    Body: { name, type, status }
DELETE /machines/{id}
```

**Machine Status values:** `OPERATIONAL`, `UNDER_MAINTENANCE`, `BROKEN`, `OFFLINE`, `DECOMMISSIONED`

---

### 11.8 Settings (Admin)

**Route:** `/admin/settings`  
**Access:** ADMIN only

**Features:**

- Create new users directly (without registration flow)
- System-wide settings

**API:**

```
GET  /users/all        → User[]
GET  /shifts           → Shift[]
POST /auth/register    multipart/form-data   (create user directly)
```

---

### 11.9 Electricity Settings

**Route:** `/admin/settings/electricity`  
**Access:** ADMIN, ENGINEER

**Features:**

- Set current kWh price (used in electricity cost calculations)
- Price history

**API:**

```
GET  /electricity/kwh-price          → KwhPrice | null
POST /electricity/kwh-price    Body: { price }
```

---

### 11.10 Worker Snapshots Admin

**Route:** `/admin/snapshots`  
**Access:** ADMIN only

**Features:**

- View all workers' machine counter + electricity snapshots
- Filter by worker and date

**API:**

```
GET /settings/snapshots/admin?userId=&from=&to=   → WorkerSnapshot[]
GET /users/all                                     → User[]
```

---

### 11.11 Worker Records Admin

**Route:** `/admin/worker-records`  
**Access:** ADMIN only

**Features:**

- View all worker tool entries (stops, checklists, waste, targets, kaizen, quality, micro-stops, anomalies)
- Filter by worker and date

**API:**

```
GET /users/all
GET /worker-tools/machine-stop-alerts
GET /worker-tools/shift-checklists
GET /worker-tools/material-waste
GET /worker-tools/daily-targets
GET /worker-tools/kaizen
GET /worker-tools/quality-issues
GET /worker-tools/micro-stops
GET /worker-tools/electricity-anomaly-alerts
```

---

### 11.12 Audit Logs

**Route:** `/admin/audit-logs`  
**Access:** ADMIN only

**Features:**

- System audit trail (who did what, when)
- Filter by action type, user, date range

**API:**

```
GET /audit-logs?userId=&action=&fromDate=&toDate=   → AuditLog[]
```

**Data:**

```typescript
type AuditLog = {
  id: number;
  action: string;
  userId: number;
  user?: { fullName: string };
  targetId?: number;
  targetType?: string;
  details?: string;
  createdAt: string;
};
```

---

### 11.13 Dashboard Analytics

**Route:** `/admin/dashboard-analytics`  
**Access:** ADMIN only

**Features:**

- Advanced charts: production trends, revenue trends, user activity
- Multi-metric dashboard

**API:**

```
GET /dashboard/analytics          → AdminAnalytics
GET /dashboard/stats              → QuickStats
GET /production/admin/overview    → AdminOverview
GET /financial/dashboard          → DashboardData
```

---

### 11.14 Engineer Overview (Admin)

**Route:** `/admin/engineer`  
**Access:** ADMIN only

**Features:**

- Admin view of all engineering activity
- Machine health summary, maintenance status, quality summary

**API:**

```
GET /machines                        → Machine[]
GET /maintenance                     → MaintenanceRecord[]
GET /quality-checks/all              → QualityCheck[]
GET /machine-health                  → MachineHealth[]
```

---

## 12. Real-Time (Socket.IO)

### Connection Setup

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:8080", {
  withCredentials: true,
  auth: { token: "Bearer <jwt_token>" },
});
```

### Events

#### Chat Events

| Event          | Direction | Payload                                      |
| -------------- | --------- | -------------------------------------------- |
| `join_group`   | emit      | `{ groupId: number }`                        |
| `leave_group`  | emit      | `{ groupId: number }`                        |
| `send_message` | emit      | `{ groupId: number, content: string }`       |
| `new_message`  | on        | `{ groupId: number, message: GroupMessage }` |
| `message_read` | on        | `{ groupId: number, userId: number }`        |

#### Notification Events

| Event          | Direction | Payload                        |
| -------------- | --------- | ------------------------------ |
| `notification` | on        | `{ id, title, message, type }` |
| `unread_count` | on        | `{ count: number }`            |

#### Machine/Alert Events

| Event                | Direction | Payload                              |
| -------------------- | --------- | ------------------------------------ |
| `machine_stop_alert` | on        | `{ machineLabel, priority, reason }` |
| `raw_material_alert` | on        | `{ materialName, currentQuantity }`  |

---

## 13. File Uploads

All file uploads use `multipart/form-data`. In React Native use `FormData`:

```javascript
const formData = new FormData();
formData.append('machineLabel', 'Machine A');
formData.append('machineCounter', String(1234));
formData.append('electricityKwh', String(56.7));
formData.append('machineCounterImage', {
  uri: photo.uri,
  type: 'image/jpeg',
  name: 'counter.jpg',
} as any);

const res = await fetch(`${API_BASE_URL}/settings/snapshots`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Endpoints that accept files

| Endpoint                            | Field Name                                | Accepted Types |
| ----------------------------------- | ----------------------------------------- | -------------- |
| `POST /settings/snapshots`          | `machineCounterImage`, `electricityImage` | image/\*       |
| `POST /production` (consumption)    | `document`                                | any            |
| `POST /sales`                       | `invoiceFile`                             | PDF, image     |
| `POST /purchases`                   | `invoiceFile`                             | PDF, image     |
| `POST /auth/register`               | `profileImage`                            | image/\*       |
| `PUT /profile/me`                   | `profileImage`                            | image/\*       |
| `POST /profile/documents`           | `file`                                    | any            |
| `POST /tech-documents`              | `document`                                | PDF, image     |
| `POST /worker-tools/quality-issues` | `issueImage`                              | image/\*       |

### Accessing uploaded files

File paths returned in responses are relative server paths like `/uploads/pictures/filename.jpg`.  
Full URL: `http://localhost:8080/uploads/pictures/filename.jpg`

---

## 14. Data Models Reference

### Core Models

```typescript
type User = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER";
  profileImage?: string | null;
  phone?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  linkedIn?: string | null;
  skills?: string | null;
  profileCompleted: boolean;
  isActive: boolean;
  shiftId?: number | null;
  shift?: Shift | null;
  createdAt: string;
};

type Shift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type Machine = {
  id: number;
  name: string;
  type: string; // "CAPS" | "PREFORM"
  status: string; // "OPERATIONAL" | "UNDER_MAINTENANCE" | "BROKEN" | "OFFLINE" | "DECOMMISSIONED"
  createdAt: string;
};

type RawMaterial = {
  id: number;
  name: string;
  currentQuantity: number;
  unit: string;
  minQuantity?: number | null;
};

type AttendanceRecord = {
  id: number;
  userId: number;
  checkIn: string;
  checkOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  notes?: string | null;
  user?: { fullName: string; username: string; role: string };
  shift?: { id: number; name: string } | null;
};

type ProductionRecord = {
  id: number;
  userId: number;
  machineId?: number | null;
  shiftId?: number | null;
  cartonsCount?: number | null;
  piecesPerCarton?: number | null;
  totalPieces?: number | null;
  workingCavities?: number | null;
  rawHdpeUsed?: number | null;
  rawLdpeUsed?: number | null;
  rawPetUsed?: number | null;
  colorUsed?: number | null;
  adhesiveUsed?: number | null;
  emptyBagsUsed?: number | null;
  notes?: string | null;
  createdAt: string;
  user?: { fullName: string; username: string };
  machine?: Machine;
  shift?: Shift;
};

type QualityCheck = {
  id: number;
  machineId: number;
  batchCode: string;
  checkType: string;
  result: "PASS" | "FAIL" | "PARTIAL";
  notes?: string | null;
  date: string;
  machine?: Machine;
  createdBy?: { fullName: string };
};

type MaintenanceRecord = {
  id: number;
  machineId: number;
  type: "BREAKDOWN" | "SCHEDULED" | "PREVENTIVE";
  description: string;
  startDate: string;
  endDate?: string | null;
  cost?: number | null;
  technician?: string | null;
  status: string;
  machine?: Machine;
};

type SaleRecord = {
  id: number;
  customerId: number;
  date: string;
  totalAmount: number;
  customer?: { id: number; name: string; phone?: string; email?: string };
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
};

type SaleItem = {
  id: number;
  machineType: string;
  size: string;
  quantity: number;
  pricePerUnit: number;
};

type PurchaseRecord = {
  id: number;
  supplierId: number;
  date: string;
  totalAmount: number;
  supplier?: { id: number; name: string; phone?: string; email?: string };
  items: PurchaseItem[];
  fileAttachments?: FileAttachment[];
};

type PurchaseItem = {
  id: number;
  materialId: number;
  quantity: number;
  pricePerUnit: number;
  material?: RawMaterial;
};

type FileAttachment = {
  id: number;
  fileName: string;
  filePath: string;
  publicUrl?: string;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
};

type AuditLog = {
  id: number;
  action: string;
  userId: number;
  user?: { fullName: string };
  targetId?: number;
  targetType?: string;
  details?: string;
  createdAt: string;
};
```

---

## Quick Reference: All API Endpoints

| Method | Endpoint                                 | Access           | Description           |
| ------ | ---------------------------------------- | ---------------- | --------------------- |
| POST   | `/auth/login`                            | Public           | Login                 |
| POST   | `/auth/logout`                           | Auth             | Logout                |
| POST   | `/auth/register`                         | Public           | Register              |
| POST   | `/auth/forgot-password`                  | Public           | Request reset         |
| POST   | `/auth/reset-password`                   | Public           | Reset password        |
| GET    | `/profile/me`                            | Auth             | Get own profile       |
| PUT    | `/profile/me`                            | Auth             | Update profile        |
| POST   | `/profile/change-password`               | Auth             | Change password       |
| GET    | `/users/all`                             | ADMIN            | All users             |
| PUT    | `/users/{id}`                            | ADMIN            | Update user           |
| GET    | `/shifts`                                | Auth             | All shifts            |
| PUT    | `/shifts/{id}`                           | ADMIN            | Update shift          |
| GET    | `/machines`                              | Auth             | All machines          |
| POST   | `/machines`                              | ADMIN            | Create machine        |
| PUT    | `/machines/{id}`                         | ADMIN            | Update machine        |
| DELETE | `/machines/{id}`                         | ADMIN            | Delete machine        |
| GET    | `/attendance/me`                         | Auth             | My attendance         |
| POST   | `/attendance/check-in`                   | Auth             | Check in              |
| POST   | `/attendance/check-out`                  | Auth             | Check out             |
| GET    | `/attendance/all`                        | ADMIN/ACCOUNTANT | All attendance        |
| POST   | `/attendance`                            | ADMIN            | Create record         |
| PUT    | `/attendance/{id}`                       | ADMIN            | Update record         |
| DELETE | `/attendance/{id}`                       | ADMIN            | Delete record         |
| GET    | `/attendance/settings`                   | ADMIN            | Grace settings        |
| PUT    | `/attendance/settings`                   | ADMIN            | Update settings       |
| GET    | `/production/me`                         | Auth             | My production         |
| GET    | `/production/all`                        | ADMIN+           | All production        |
| POST   | `/production`                            | Auth             | Log production        |
| GET    | `/payroll/me`                            | Auth             | My monthly payroll    |
| GET    | `/payroll/daily/me`                      | Auth             | My daily payroll      |
| GET    | `/payroll/daily`                         | ADMIN/ACCOUNTANT | All daily payroll     |
| POST   | `/payroll/daily/calculate-date`          | ADMIN/ACCOUNTANT | Calculate for date    |
| POST   | `/payroll/daily/{id}/confirm`            | ADMIN/ACCOUNTANT | Confirm daily pay     |
| GET    | `/payroll/admin/overview`                | ADMIN/ACCOUNTANT | Monthly overview      |
| POST   | `/payroll/monthly/calculate`             | ADMIN/ACCOUNTANT | Calculate all monthly |
| GET    | `/payroll/salary-config`                 | ADMIN/ACCOUNTANT | Role salary config    |
| PUT    | `/payroll/salary-config`                 | ADMIN            | Update salary config  |
| GET    | `/payroll/admin/user-salaries`           | ADMIN            | Per-user salaries     |
| PUT    | `/payroll/admin/user-salaries/{userId}`  | ADMIN            | Set user salary       |
| GET    | `/payroll/admin/deduction-rules`         | ADMIN/ACCOUNTANT | Deduction rules       |
| PUT    | `/payroll/admin/deduction-rules/{type}`  | ADMIN            | Update deduction rule |
| PATCH  | `/payroll/admin/attendance/{id}/leave`   | ADMIN            | Set leave type        |
| GET    | `/inventory/materials`                   | Auth             | Raw materials         |
| GET    | `/inventory/transactions/all`            | ADMIN+           | Transactions          |
| POST   | `/inventory/add`                         | ADMIN+           | Add stock             |
| GET    | `/sales/all`                             | ADMIN+           | All sales             |
| GET    | `/sales/customers`                       | ADMIN+           | Customer list         |
| POST   | `/sales`                                 | ADMIN+           | Create sale           |
| PUT    | `/sales/{id}`                            | ADMIN+           | Update sale           |
| DELETE | `/sales/{id}`                            | ADMIN+           | Delete sale           |
| GET    | `/purchases/all`                         | ADMIN+           | All purchases         |
| GET    | `/purchases/suppliers`                   | ADMIN+           | Supplier list         |
| POST   | `/purchases`                             | ADMIN+           | Create purchase       |
| PUT    | `/purchases/{id}`                        | ADMIN+           | Update purchase       |
| DELETE | `/purchases/{id}`                        | ADMIN+           | Delete purchase       |
| GET    | `/electricity/readings`                  | Auth             | Readings list         |
| POST   | `/electricity/readings`                  | Auth             | Add reading           |
| PATCH  | `/electricity/readings/{id}`             | ADMIN            | Edit reading          |
| DELETE | `/electricity/readings/{id}`             | ADMIN            | Delete reading        |
| GET    | `/electricity/kwh-price`                 | Auth             | Current kWh price     |
| POST   | `/electricity/kwh-price`                 | ADMIN            | Set kWh price         |
| GET    | `/quality-checks/all`                    | ENGINEER+        | All checks            |
| POST   | `/quality-checks`                        | ENGINEER+        | Add check             |
| GET    | `/maintenance`                           | Auth             | Maintenance records   |
| POST   | `/maintenance`                           | ENGINEER+        | Add record            |
| GET    | `/spare-parts`                           | ENGINEER+        | Spare parts           |
| POST   | `/spare-parts`                           | ENGINEER+        | Add part              |
| GET    | `/notifications`                         | Auth             | My notifications      |
| PATCH  | `/notifications/mark-all-read`           | Auth             | Mark all read         |
| GET    | `/notifications/unread-count`            | Auth             | Unread count          |
| GET    | `/chat/groups`                           | Auth             | My groups             |
| POST   | `/chat/groups/{id}/messages`             | Auth             | Send message          |
| GET    | `/expenses`                              | ACCOUNTANT+      | All expenses          |
| POST   | `/expenses`                              | ACCOUNTANT+      | Add expense           |
| PATCH  | `/expenses/{id}/approve`                 | ADMIN            | Approve expense       |
| GET    | `/invoices`                              | ACCOUNTANT+      | All invoices          |
| POST   | `/invoices`                              | ACCOUNTANT+      | Create invoice        |
| GET    | `/financial/dashboard`                   | ACCOUNTANT+      | Financial KPIs        |
| GET    | `/supplier-payables`                     | ACCOUNTANT+      | Payables              |
| GET    | `/customer-receivables`                  | ACCOUNTANT+      | Receivables           |
| GET    | `/budget-plans`                          | ACCOUNTANT+      | Budgets               |
| GET    | `/settings/snapshots/mine`               | WORKER           | My snapshots          |
| POST   | `/settings/snapshots`                    | WORKER           | Submit snapshot       |
| GET    | `/worker-tools/machine-stop-alerts/mine` | WORKER           | My alerts             |
| POST   | `/worker-tools/machine-stop-alerts`      | WORKER           | Submit alert          |
| GET    | `/audit-logs`                            | ADMIN            | Audit trail           |
| GET    | `/registration-requests`                 | ADMIN            | Reg requests          |
| POST   | `/registration-requests/{id}/approve`    | ADMIN            | Approve request       |
| GET    | `/dashboard/analytics`                   | ADMIN            | Analytics             |
| GET    | `/dashboard/stats`                       | ADMIN            | Quick stats           |

---

_Last updated: 2026-05-04 — backend at `http://localhost:8080`, branch `mhmdBranch`_
