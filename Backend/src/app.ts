import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { initializeSocketServer } from "./config/socket";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import productionRoutes from "./routes/productionRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import qualityRoutes from "./routes/qualityRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import saleRoutes from "./routes/saleRoutes";
import reportRoutes from "./routes/reportRoutes";
import chatRoutes from "./routes/chatRoutes";
import auditRoutes from "./routes/auditRoutes";
import payrollRoutes from "./routes/payrollRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import shiftsRoutes from "./routes/shiftsRoutes";
import machinesRoutes from "./routes/machinesRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import workerFeaturesRoutes from "./routes/workerFeaturesRoutes";
import engineerInventoryRoutes from "./routes/engineerInventoryRoutes";
import machineHealthRoutes from "./routes/machineHealthRoutes";
import maintenanceScheduleRoutes from "./routes/maintenanceScheduleRoutes";
import sparePartsRoutes from "./routes/sparePartsRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import financialRoutes from "./routes/financialRoutes";
import financialReportRoutes from "./routes/financialReportRoutes";
import supplierPayableRoutes from "./routes/supplierPayableRoutes";
import customerReceivableRoutes from "./routes/customerReceivableRoutes";
import budgetPlanRoutes from "./routes/budgetPlanRoutes";
import taxFilingRoutes from "./routes/taxFilingRoutes";
import bankReconciliationRoutes from "./routes/bankReconciliationRoutes";
import costAnalysisRoutes from "./routes/costAnalysisRoutes";
import approvalWorkflowRoutes from "./routes/approvalWorkflowRoutes";
import rawMaterialAlertRoutes from "./routes/rawMaterialAlertRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import performanceRoutes from "./routes/performanceRoutes";
import maintenanceCostRoutes from "./routes/maintenanceCostRoutes";
import electricityRoutes from "./routes/electricityRoutes";
import profileRoutes from "./routes/profileRoutes";
import registrationRequestRoutes from "./routes/registrationRequestRoutes";
import sparePartRequestRoutes from "./routes/sparePartRequestRoutes";
import techDocumentRoutes from "./routes/techDocumentRoutes";
import customerReturnRoutes from "./routes/customerReturnRoutes";
import supportMachineRoutes from "./routes/supportMachineRoutes";
import aiRoutes from "./routes/aiRoutes";
import ragContextRoutes from "./routes/ragContextRoutes";
import salesRepRoutes from "./routes/salesRepRoutes";
import { initializeEmailService } from "./utils/emailService";
import { startNotificationScheduler } from "./services/notificationScheduler";
import { prisma } from "./config/lib/prisma";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const PORT = Number(process.env.PORT) || 8080;
const defaultFrontendOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8081",  // Expo web dev server
  "http://localhost:19006", // Expo web (older versions)
];
const configuredFrontendOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([...defaultFrontendOrigins, ...configuredFrontendOrigins]),
);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve static files — allow cross-origin loading and iframe embedding (frontend on different port)
app.use(
  "/pictures",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.removeHeader("X-Frame-Options"); // allow <iframe> embedding from frontend origin
    next();
  },
  express.static(path.resolve(__dirname, "..", "prisma", "pictures")),
);

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use("/auth", authRateLimit, authRoutes);
app.use("/registration-requests", registrationRequestRoutes);
app.use("/profile", profileRoutes);
app.use("/users", userRoutes);
app.use("/settings", settingsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/production", productionRoutes);
app.use("/maintenance", maintenanceRoutes);
app.use("/quality-checks", qualityRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/sales", saleRoutes);
app.use("/reports", reportRoutes);
app.use("/chat", chatRoutes);
app.use("/audit", auditRoutes);
app.use("/payroll", payrollRoutes);
app.use("/notifications", notificationRoutes);
app.use("/shifts", shiftsRoutes);
app.use("/machines", machinesRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/worker-tools", workerFeaturesRoutes);
app.use("/engineer-inventory", engineerInventoryRoutes);
app.use("/machine-health", machineHealthRoutes);
app.use("/maintenance-schedule", maintenanceScheduleRoutes);
app.use("/spare-parts", sparePartsRoutes);
app.use("/expenses", expenseRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/financial", financialRoutes);
app.use("/financial-reports", financialReportRoutes);
app.use("/supplier-payables", supplierPayableRoutes);
app.use("/customer-receivables", customerReceivableRoutes);
app.use("/budgets", budgetPlanRoutes);
app.use("/tax-filings", taxFilingRoutes);
app.use("/bank-reconciliations", bankReconciliationRoutes);
app.use("/cost-analysis", costAnalysisRoutes);
app.use("/approval-workflows", approvalWorkflowRoutes);
app.use("/raw-material-alerts", rawMaterialAlertRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/performance", performanceRoutes);
app.use("/maintenance-costs", maintenanceCostRoutes);
app.use("/electricity", electricityRoutes);
app.use("/spare-part-requests", sparePartRequestRoutes);
app.use("/tech-documents", techDocumentRoutes);
app.use("/customer-returns", customerReturnRoutes);
app.use("/support-machine-readings", supportMachineRoutes);
app.use("/ai", aiRoutes);
app.use("/rag-context", ragContextRoutes);
app.use("/sales-rep", salesRepRoutes);

// Global JSON error handler — catches multer/middleware errors and returns JSON
app.use((err: Error & { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as any).status ?? (err as any).statusCode ?? 500;
  console.error("Unhandled error:", err.message, err.code ?? "");
  res.status(status).json({ message: err.message ?? "Internal server error" });
});

initializeSocketServer(server);

async function initializeRawSqlTables(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS operation_snapshots (
        id SERIAL PRIMARY KEY,
        machine_label TEXT NOT NULL,
        machine_counter DOUBLE PRECISION NOT NULL,
        electricity_kwh DOUBLE PRECISION NOT NULL,
        notes TEXT,
        machine_counter_image TEXT,
        electricity_image TEXT,
        created_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_operation_snapshots_created_at
      ON operation_snapshots (created_at DESC)
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_machine_stop_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        machine_label TEXT NOT NULL,
        priority TEXT NOT NULL,
        reason TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        response_minutes DOUBLE PRECISION,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_shift_checklists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        shift_phase TEXT NOT NULL,
        tasks_json JSONB NOT NULL,
        digital_signature TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_material_waste_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        machine_label TEXT NOT NULL,
        machine_type TEXT,
        material_type TEXT NOT NULL,
        waste_kg DOUBLE PRECISION NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_daily_targets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        target_date DATE NOT NULL,
        target_units DOUBLE PRECISION NOT NULL,
        actual_units DOUBLE PRECISION NOT NULL,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_kaizen_suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        estimated_impact TEXT,
        review_status TEXT NOT NULL DEFAULT 'PENDING',
        review_note TEXT,
        reviewed_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        score INTEGER NOT NULL DEFAULT 0,
        reward_points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE worker_kaizen_suggestions
      ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'PENDING'
    `;
    await prisma.$executeRaw`
      ALTER TABLE worker_kaizen_suggestions
      ADD COLUMN IF NOT EXISTS review_note TEXT
    `;
    await prisma.$executeRaw`
      ALTER TABLE worker_kaizen_suggestions
      ADD COLUMN IF NOT EXISTS reviewed_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL
    `;
    await prisma.$executeRaw`
      ALTER TABLE worker_kaizen_suggestions
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_quality_issue_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        batch_code TEXT NOT NULL,
        machine_label TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        details TEXT,
        issue_image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_micro_stops (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        machine_label TEXT NOT NULL,
        reason TEXT NOT NULL,
        duration_minutes DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS worker_electricity_anomaly_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        machine_label TEXT NOT NULL,
        current_kwh DOUBLE PRECISION NOT NULL,
        baseline_kwh DOUBLE PRECISION NOT NULL,
        threshold_ratio DOUBLE PRECISION NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS support_machine_readings (
        id SERIAL PRIMARY KEY,
        machine_name TEXT NOT NULL,
        reading_type TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL,
        notes TEXT,
        image_path TEXT,
        shift TEXT,
        created_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_support_machine_readings_created_at
      ON support_machine_readings (created_at DESC)
    `;
    console.log("raw SQL tables initialized");
  } catch (err) {
    console.error("failed to initialize raw SQL tables:", err);
  }
}

let hasRetriedPortBind = false;

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE" && !hasRetriedPortBind) {
    hasRetriedPortBind = true;
    console.warn(`port ${PORT} is busy, retrying once...`);
    setTimeout(() => {
      server.listen(PORT);
    }, 1000);
    return;
  }

  console.error("server startup error:", error);
  process.exit(1);
});

void (async () => {
  await initializeRawSqlTables();
  server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    startNotificationScheduler();
  });
  void initializeEmailService();
})();
