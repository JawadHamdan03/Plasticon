<div align="center">

# 🏭 Plasticon

### AI-Powered Factory Management System

A full-stack ERP platform built to digitize and modernize every aspect of a plastics manufacturing factory — from the factory floor to the accounting office.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React_Native-Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1.0-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-000000?style=for-the-badge&logo=pinecone&logoColor=white)](https://www.pinecone.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [User Roles](#-user-roles)
- [AI Capabilities](#-ai-capabilities)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Overview](#-api-overview)
- [Database Schema](#-database-schema)
- [Real-Time System](#-real-time-system)
- [Mobile App](#-mobile-app)
---

## 🌟 Overview

**Plasticon** is a comprehensive, production-ready ERP system designed for industrial plastics manufacturing. It covers every operational domain of a factory — production tracking, machine maintenance, raw material inventory, HR and payroll, financial management, and sales — all unified under a single platform accessible via **web dashboard** and **mobile app**.

What sets Plasticon apart is its deep **AI integration**: invoice extraction, production anomaly detection, maintenance report generation, a RAG-powered factory assistant, and worker coaching — all powered by GPT-4o and LangChain.

> Built as a graduation project for a real plastics factory producing **caps** and **PET preforms**.

---

## ✨ Features

### 🏗️ Production & Operations
- Hourly production records per machine and shift (cartons, pieces, cavities)
- Raw material consumption tracking (HDPE, LDPE, PET, adhesive, bags, color)
- Damaged vs. net good pieces tracking
- Machine downtime logging with categorized reasons
- Operation snapshots (machine counter + electricity readings)
- Worker micro-stops and material waste logs
- Daily production targets vs. actuals

### 🔧 Machine & Maintenance
- Machine status management (Operational / Maintenance / Broken / Offline / Decommissioned)
- Machine health records with efficiency ratings and downtime percentages
- Preventive maintenance scheduling (Daily / Weekly / Monthly / Quarterly / Yearly)
- Maintenance cost tracking (labor + spare parts)
- Spare parts inventory with minimum quantity alerts
- Spare part requests with pricing workflow
- Quality checks with severity levels and file attachments
- Equipment calibration, lifecycle tracking, and transfer logs
- Technical documentation library (manuals, safety docs, references)
- Support machine readings (auxiliary equipment)

### 💰 Finance & Accounting
- Invoice management with AI-powered data extraction
- Expense tracking with approval workflows
- Supplier management and payables tracking
- Customer management and receivables tracking
- Budget planning by category and month
- Financial reports (P&L, Balance Sheet, Cash Flow)
- Tax compliance and filings
- Bank reconciliation
- Cost analysis and breakdowns
- Payroll: daily pay calculation + monthly salary generation
- Deduction rules (late arrival, early checkout, sick leave, absence)

### 📦 Inventory & Purchasing
- Raw material stock with IN/OUT transaction history
- Low-stock alerts per material with configurable thresholds
- Purchase orders with supplier invoices and items
- Inventory consumption recording per shift

### 📊 Sales & CRM
- Customer database with assigned sales reps
- Sales records with line items (product type, size, quantity, price)
- Customer returns tracking (caps / preforms)
- Quotation builder (Draft → Sent → Accepted / Rejected)
- Customer visit logs with outcomes and follow-ups
- Monthly sales targets vs. achieved amounts

### 👷 HR & Attendance
- Shift check-in / check-out with late and overtime tracking
- Leave management (sick, annual, unpaid)
- Employee performance scoring (production, quality, attendance, Kaizen)
- Kaizen suggestion system with review and reward points
- Worker daily checklists with digital signature
- Worker coaching system
- User profiles with documents, skills, job titles

### 🔔 Notifications & Communication
- Real-time group chat (Socket.io) with department, team, and project groups
- Push notifications to mobile via Expo push service
- Automated shift start/end reminders (30 min / 20 min before)
- Missing check-in/check-out alerts
- Monthly payroll reminder (10th of each month)
- Low inventory and raw material alerts
- Maintenance urgent alerts, quality issue alerts

### ⚙️ Admin & Settings
- User management (create, activate/deactivate, assign shifts)
- Registration request review and approval
- Shift configuration
- Machine registry
- Production settings (pieces per carton per product type)
- System settings (quality check intervals, inventory audit frequency, report scheduling)
- Electricity kWh price management
- Salary configuration per role
- Audit logs for all system actions
- Dashboard analytics

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│                                                             │
│   ┌─────────────────────┐    ┌─────────────────────────┐   │
│   │   Web Dashboard     │    │     Mobile App          │   │
│   │   React 19 + Vite   │    │   Expo React Native     │   │
│   │   Tailwind CSS v4   │    │   iOS & Android         │   │
│   │   Port: 3000        │    │   Port: 8081            │   │
│   └──────────┬──────────┘    └────────────┬────────────┘   │
└──────────────┼──────────────────────────── ┼───────────────┘
               │  REST + WebSocket           │  REST + Push
               ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVER LAYER                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Backend API — Port 8080                │   │
│   │         Node.js · Express 5 · TypeScript            │   │
│   │         Prisma ORM · Socket.io · JWT Auth           │   │
│   │         node-cron · nodemailer · multer             │   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              RAG AI Server — Port 3001              │   │
│   │      LangChain · GPT-4o · Pinecone · FastAPI        │   │
│   │   Chat · Ingest · Bill Analysis · Material Analysis │   │
│   └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                            │
│                                                             │
│   ┌──────────────────┐        ┌──────────────────────────┐  │
│   │   PostgreSQL 16   │        │  Pinecone Vector Store   │  │
│   │  (Prisma schema)  │        │  (RAG knowledge base)    │  │
│   └──────────────────┘        └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Web Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS v4, React Router v7 |
| **Mobile** | Expo, React Native, TypeScript |
| **Backend** | Node.js, Express 5, TypeScript, JWT, Socket.io, node-cron |
| **ORM / DB** | Prisma 7, PostgreSQL 16 |
| **AI / RAG** | LangChain, LangGraph, OpenAI GPT-4o, Pinecone |
| **File Handling** | Multer, Cloudinary-compatible static serving |
| **Email** | Nodemailer |
| **Push Notifications** | Expo Server SDK |
| **PDF Generation** | jsPDF, jspdf-autotable |
| **Excel Export** | XLSX |
| **Form Handling** | React Hook Form, Zod |
| **Testing** | Vitest, Supertest |
| **Containerization** | Docker, Docker Compose |
| **UI Components** | Lucide React, Framer Motion, React Hot Toast |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **WORKER** | Attendance, production records, machine readings, electricity, Kaizen suggestions, checklists, snapshots |
| **ENGINEER** | Maintenance, quality checks, machine health, spare parts, schedules, engineer inventory, tech docs, support machines |
| **ACCOUNTANT** | Invoices, expenses, payroll, financial reports, suppliers, customers, budget planning, tax, reconciliation, customer returns |
| **ADMIN** | Full access — user management, system settings, shifts, machines, audit logs, all dashboards |
| **SALES_REP** | Customers, quotations, customer visits, sales targets |

---

## 🤖 AI Capabilities

### 1. Invoice Data Extraction
Extracts customer name, product, quantity, date, and amounts from invoice images using GPT-4o vision.

### 2. RAG Factory Assistant
A LangGraph ReAct agent backed by a Pinecone vector store. Ingests factory documents (manuals, SOPs, guidelines) and answers role-aware questions with semantic retrieval.

### 3. Production Anomaly Detection
Analyzes production data to detect unusual drops, material waste spikes, or machine performance degradation.

### 4. Maintenance Report Generator
Automatically generates structured maintenance reports from raw maintenance records.

### 5. Shift Handover AI
Generates shift handover summaries for outgoing/incoming shift managers.

### 6. Worker Coaching
AI-driven coaching feedback based on a worker's performance metrics and attendance history.

### 7. Raw Material Datasheet Analysis
Parses raw material supplier datasheets to extract technical specifications.

### 8. Factory Bill Analysis
Parses electricity bills (PDF) to extract consumption data and costs.

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 22+](https://nodejs.org/) (for local development)
- OpenAI API key
- Pinecone API key

### Run with Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/[your-username]/plasticon.git
cd plasticon

# 2. Create environment files (see Environment Variables section)
cp Backend/.env.example Backend/.env.docker
cp RAG/.env.example RAG/.env.docker
cp PlasticonMobile/.env.example PlasticonMobile/.env.docker

# 3. Start all services
docker compose up --build

# Services will be available at:
# Web:     http://localhost:3000
# API:     http://localhost:8080
# RAG:     http://localhost:3001
# Mobile:  http://localhost:8081
```

### Run Locally (Development)

```bash
# Start PostgreSQL (via Docker)
docker compose up postgres -d

# Backend
cd Backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (new terminal)
cd Frontend
npm install
npm run dev

# RAG Server (new terminal)
cd RAG
npm install
npm run dev

# Mobile (new terminal)
cd PlasticonMobile
npm install
npx expo start
```

### Database Seeding

The seed script creates default users for each role:

```bash
cd Backend
npm run seed
```

---

## 🔑 Environment Variables

### Backend (`Backend/.env`)

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/plasticon"
JWT_SECRET="your-jwt-secret"
PORT=8080
FRONTEND_ORIGIN="http://localhost:5173,http://localhost:5174"

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# AI
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### RAG Server (`RAG/.env`)

```env
OPENAI_API_KEY="sk-..."
PINECONE_API_KEY="pcsk-..."
PINECONE_INDEX="plasticon-knowledge"
BACKEND_URL="http://localhost:8080"
FRONTEND_ORIGIN="http://localhost:5173"
PORT=3001
```

### Mobile (`PlasticonMobile/.env`)

```env
EXPO_PUBLIC_API_URL="http://192.168.x.x:8080"
EXPO_PUBLIC_RAG_URL="http://192.168.x.x:3001"
```

---

## 📁 Project Structure

```
plasticon/
├── Backend/                    # Express API server
│   ├── prisma/
│   │   ├── schema.prisma       # 40+ model database schema
│   │   ├── seed.ts             # Default data seeder
│   │   └── migrations/         # Prisma migration history
│   └── src/
│       ├── app.ts              # Server entry point
│       ├── routes/             # 48 route modules
│       ├── controllers/        # 48 controller modules
│       ├── services/           # Business logic layer
│       ├── middleware/         # Auth middleware (JWT)
│       ├── config/
│       │   ├── socket.ts       # Socket.io server
│       │   └── lib/prisma.ts   # Prisma client instance
│       └── utils/              # Email service, helpers
│
├── Frontend/                   # React web dashboard
│   └── src/
│       ├── App.tsx             # Router + lazy page imports
│       ├── pages/
│       │   ├── admin/          # 16 admin pages
│       │   ├── engineer/       # 16 engineer pages
│       │   ├── accountant/     # 17 accountant pages
│       │   ├── worker/         # 2 worker pages
│       │   ├── sales-rep/      # 5 sales rep pages
│       │   ├── shared/         # Shared pages (dashboard, chat, etc.)
│       │   ├── ai/             # 6 AI tool pages
│       │   └── auth/           # Auth pages
│       ├── components/         # Shared UI components
│       ├── context/            # Auth, Theme, Locale providers
│       └── lib/                # API utilities
│
├── PlasticonMobile/            # Expo React Native app
│   └── src/
│       ├── screens/
│       │   ├── worker/         # 19 worker screens
│       │   ├── engineer/       # 21 engineer screens
│       │   ├── accountant/     # 21 accountant screens
│       │   ├── sales-rep/      # 6 sales rep screens
│       │   ├── admin/          # Admin screens
│       │   └── auth/           # Auth screens
│       ├── navigation/         # Role-based tab navigators
│       ├── context/            # Theme, Auth context
│       └── config.ts           # API base URL config
│
├── RAG/                        # LangChain AI server
│   ├── index.js                # Express entry point
│   ├── agent.js                # LangGraph ReAct agent
│   ├── ingest.js               # Document ingestion to Pinecone
│   ├── billAnalysis.js         # Factory bill PDF parser
│   ├── routes/
│   │   ├── chat.js             # RAG chat endpoint
│   │   ├── materialAnalysis.js # Material datasheet analysis
│   │   └── productionSummary.js# AI production summary
│   ├── services/
│   │   └── backendAPI.js       # Backend data fetcher for AI context
│   └── knowledge/              # Seeded knowledge base docs
│       ├── factory-overview.md
│       ├── api-worker.md
│       ├── api-engineer.md
│       ├── api-accountant.md
│       └── api-admin.md
│
└── docker-compose.yml          # All 4 services + PostgreSQL
```

---

## 🌐 API Overview

The backend exposes **48 REST API modules** mounted at the following base paths:

| Path | Domain |
|---|---|
| `/auth` | Authentication (login, register, password reset) |
| `/users` | User management |
| `/profile` | User profile and documents |
| `/attendance` | Shift check-in / check-out |
| `/production` | Production records |
| `/machines` | Machine registry and status |
| `/maintenance` | Maintenance records |
| `/maintenance-schedule` | Preventive maintenance scheduling |
| `/machine-health` | Machine health records |
| `/quality-checks` | Quality inspection records |
| `/spare-parts` | Spare parts inventory |
| `/spare-part-requests` | Engineer spare part requests |
| `/inventory` | Raw material inventory |
| `/purchases` | Purchase orders |
| `/sales` | Sales records |
| `/customer-returns` | Product return records |
| `/suppliers` | Supplier management |
| `/invoices` | Invoice management |
| `/expenses` | Expense tracking |
| `/financial` | Financial settings and summaries |
| `/financial-reports` | Report generation |
| `/payroll` | Payroll calculation and management |
| `/electricity` | Electricity readings and kWh pricing |
| `/chat` | Group chat messages |
| `/notifications` | Notification management |
| `/dashboard` | Dashboard aggregations |
| `/reports` | Cross-domain reports |
| `/shifts` | Shift configuration |
| `/settings` | System settings |
| `/engineer-inventory` | Engineer monthly parts inventory |
| `/support-machine-readings` | Auxiliary equipment readings |
| `/tech-documents` | Technical documentation library |
| `/worker-tools` | Worker-specific tools (kaizen, checklists, snapshots) |
| `/performance` | Employee performance records |
| `/sales-rep` | Sales rep features (quotations, visits, targets) |
| `/ai` | AI tool endpoints |
| `/rag-context` | RAG context injection for AI tools |
| `/audit` | Audit log access |
| `/registration-requests` | New user registration approval |

---

## 🗄️ Database Schema

The Prisma schema contains **40+ models** organized into these domains:

| Domain | Models |
|---|---|
| **Core** | User, Shift, Attendance, AttendanceSetting |
| **Machines** | Machine, MachineReading, ElectricityReading, ElectricityKwhPrice |
| **Production** | ProductionRecord, ProductionSetting |
| **Maintenance** | Maintenance, MaintenanceSchedule, MachineHealthRecord, MaintenanceCost, QualityCheck |
| **Spare Parts** | SparePart, SparePartRequest |
| **Inventory** | RawMaterial, InventoryTransaction, RawMaterialAlert |
| **Purchasing** | Supplier, Purchase, PurchaseItem |
| **Sales** | Customer, Sale, SaleItem, CustomerReturn, InvoiceAnalysis |
| **Finance** | Expense, Invoice, FinancialSetting, FinancialReport, BudgetPlan, TaxFiling, BankReconciliation, CostAnalysis, ApprovalWorkflow |
| **Payables/Receivables** | SupplierPayable, CustomerReceivable |
| **Payroll** | Payroll, DailyPayroll, SalaryConfig, DeductionRule |
| **Chat** | ChatGroup, GroupMember, GroupMessage |
| **Notifications** | Notification, PushToken |
| **Engineer Features** | EngineerInventory, EngineerInventoryItem, TechDocument |
| **HR** | EmployeePerformance, UserDocument |
| **Sales Rep** | Quotation, QuotationItem, CustomerVisit, SalesTarget |
| **System** | SystemSetting, AuditLog, FileAttachment, RegistrationRequest |

---

## ⚡ Real-Time System

Plasticon uses **Socket.io** for all real-time features:

| Event | Direction | Description |
|---|---|---|
| `chat:message` | Server → Client | New group chat message |
| `chat:unread-count-updated` | Server → Client | Unread badge refresh |
| `notification:new` | Server → Client | Incoming notification |
| `notification:unread-count-updated` | Server → Client | Notification badge refresh |
| `snapshot:created` | Server → All | New operation snapshot broadcast |
| `join:group` | Client → Server | Join a chat group room |
| `leave:group` | Client → Server | Leave a chat group room |

Each user is automatically placed in their own private room (`user:{id}`) on connection. Authentication is verified via JWT on the Socket.io handshake.

---

## 📱 Mobile App

The Expo app mirrors the web dashboard with a native mobile experience:

- **Adaptive IP config** — detects browser vs. device runtime and connects to the correct API URL
- **Role-based tab navigation** — each role gets its own bottom tab set
- **Push notifications** — Expo push tokens registered on login, notifications delivered server-side via Expo SDK
- **Offline-friendly forms** — optimistic UI with error handling

To run on a physical device, set `EXPO_PUBLIC_API_URL` in `.env` to your machine's local IP address.

---


## 🎓 About

Built as a **graduation project** for a real-world plastics manufacturing environment.

> If you found this useful, give it a ⭐ on GitHub!
