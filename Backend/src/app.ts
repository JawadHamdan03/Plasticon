import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors, { type CorsOptions } from "cors";
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
import { initializeEmailService } from "./utils/emailService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const PORT = Number(process.env.PORT) || 8080;
const defaultFrontendOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
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

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from prisma/pictures
app.use(
  "/pictures",
  express.static(path.resolve(__dirname, "..", "prisma", "pictures")),
);

app.use("/auth", authRoutes);
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

initializeSocketServer(server);

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

server.listen(PORT, () => console.log(`server is running on port ${PORT}`));

void initializeEmailService();
