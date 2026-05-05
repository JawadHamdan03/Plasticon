# Plasticon Factory Management System — Overview

## System Description
Plasticon FMS is a full-stack web application for managing a plastics factory. It covers production tracking, engineering maintenance, financial accounting, HR, inventory, and inter-department communication.

## Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (Bearer token) + HTTP-only cookie |
| File Upload | Multer |
| Real-time | Polling (notifications) |

## Roles
| Role | Description |
|---|---|
| `ADMIN` | Full system access — view-only on all data entry pages, manages users/shifts/machines |
| `ENGINEER` | Engineering tools — production, maintenance, quality, spare parts, calibration |
| `ACCOUNTANT` | Financial tools — invoices, expenses, budgets, reports, HR payroll view |
| `WORKER` | Production input — daily production entry, readings, worker tools |

## Key Modules
- **Production** — Shift-based entry of preform and caps output with material usage
- **Maintenance** — Repair reports, preventive schedule, spare parts inventory
- **Quality** — Issue logging with severity and resolution tracking
- **Finance** — Invoices, expenses, payables, receivables, budgets, tax, reconciliation
- **HR** — Attendance, payroll, salary config
- **Inventory** — Raw materials, purchases, sales, engineer parts inventory
- **Notifications** — In-app alerts for production, maintenance, quality, and stock events
- **Chat** — Group-based messaging across departments
- **Audit** — Full action log for admin review

## Base URL
Backend API: `http://localhost:3000/api`
Frontend dev: `http://localhost:5173`
