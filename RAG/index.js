import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { analyzeFactoryBill } from "./billAnalysis.js";
import { ingestData } from "./ingest.js";
import chatRouter from "./routes/chat.js";
import materialAnalysisRouter from "./routes/materialAnalysis.js";
import productionSummaryRouter from "./routes/productionSummary.js";

const app = express();
const ragAllowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",").map((o) => o.trim()).filter(Boolean);
if (!ragAllowedOrigins.length) {
  ragAllowedOrigins.push(
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:19006",
  );
}
app.use(cors({
  origin(origin, cb) {
    if (!origin || ragAllowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`RAG: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Shared disk-storage multer for file upload endpoints
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const isPdfFile = (file) => {
  const name = (file?.originalname || "").toLowerCase();
  return file?.mimetype === "application/pdf" || name.endsWith(".pdf");
};

// ── Chat (role-aware, with context injection) ──────────────────────────────
app.use("/api/chat",     chatRouter);
app.use("/api/rag/chat", chatRouter);

// ── Document ingestion ─────────────────────────────────────────────────────
const handleRagIngest = async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "Missing file" });

    const fileType = path.extname(req.file.originalname || "").toLowerCase().slice(1) || "text";
    const result = await ingestData(req.file.path, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileType,
    });
    await unlink(req.file.path).catch(() => undefined);
    return res.json({ ok: true, fileName: req.file.originalname, ...result });
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => undefined);
    return res.status(500).json({ error: err.message });
  }
};

app.post("/api/ingest",     upload.single("file"), handleRagIngest);
app.post("/api/rag/ingest", upload.single("file"), handleRagIngest);

// ── Raw material datasheet analysis ───────────────────────────────────────
app.use("/api/analyze-material", upload.single("file"), materialAnalysisRouter);

// ── Production summary (AI report from live data) ─────────────────────────
app.use("/api/production-summary", productionSummaryRouter);

// ── Factory bill analysis ──────────────────────────────────────────────────
app.post("/api/analyze-factory-bill", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "Missing PDF file" });
    if (!isPdfFile(req.file)) return res.status(400).json({ error: "Factory bill analysis requires a PDF file" });

    const result = await analyzeFactoryBill(req.file.path);
    await unlink(req.file.path).catch(() => undefined);
    return res.json({ ok: true, ...result });
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => undefined);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("🚀 RAG server running on port 3001"));
