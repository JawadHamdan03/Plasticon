import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { runAgent } from "./agent.js";
import { analyzeFactoryBill } from "./billAnalysis.js";
import { ingestData } from "./ingest.js";

const app = express();
app.use(cors());
app.use(express.json());

// Multer for file uploads
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

const handleChatRequest = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const answer = await runAgent({ message, sessionId });

    const output = answer?.output || answer?.text || "";

    if (!output || output.trim() === "") {
      return res.json({
        answer:
          "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?",
      });
    }

    res.json({ answer: output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const handleRagIngest = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "Missing file" });
    }

    const fileType = path.extname(req.file.originalname || "").toLowerCase().slice(1) || "text";
    const result = await ingestData(req.file.path, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileType,
    });
    await unlink(req.file.path).catch(() => undefined);

    return res.json({
      ok: true,
      fileName: req.file.originalname,
      ...result,
    });
  } catch (err) {
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => undefined);
    }
    return res.status(500).json({ error: err.message });
  }
};

app.post("/api/chat", async (req, res) => handleChatRequest(req, res));
app.post("/api/rag/chat", async (req, res) => handleChatRequest(req, res));

app.post("/api/ingest", upload.single("file"), async (req, res) => handleRagIngest(req, res));
app.post("/api/rag/ingest", upload.single("file"), async (req, res) => handleRagIngest(req, res));

// Factory bill analysis endpoint
app.post("/api/analyze-factory-bill", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "Missing PDF file" });
    }

    if (!isPdfFile(req.file)) {
      return res.status(400).json({ error: "Factory bill analysis requires a PDF file" });
    }

    const result = await analyzeFactoryBill(req.file.path);
    await unlink(req.file.path).catch(() => undefined);

    return res.json({ ok: true, ...result });
  } catch (err) {
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => undefined);
    }

    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("🚀 Server running on port 3001"));
