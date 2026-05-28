import { Router } from "express";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { unlink } from "node:fs/promises";

const router = Router();

const EXTRACTION_PROMPT = `You are an expert in industrial raw materials used in plastic manufacturing.
Analyze the provided datasheet and extract the following information.
Return ONLY valid JSON — no markdown, no explanation.

{
  "materialName": "string or null",
  "supplier": "string or null",
  "specifications": {
    "density": "string or null",
    "meltFlowIndex": "string or null",
    "tensileStrength": "string or null",
    "meltingPoint": "string or null",
    "other": {}
  },
  "safetyNotes": ["string"],
  "storageRequirements": "string or null",
  "compatibilityWarnings": ["string"],
  "recommendedUsage": "string or null",
  "certifications": ["string"],
  "shelfLife": "string or null"
}

Rules:
- Extract ALL safety hazard statements you find.
- If a field is not present in the document, use null or [].
- Numbers should remain as strings with their units (e.g., "0.95 g/cm³").
- The document may be in Arabic or English — extract accurately in either language.`;

async function extractWithGPT(text) {
  const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

  const response = await model.invoke([
    { role: "system", content: EXTRACTION_PROMPT },
    { role: "user",   content: `Datasheet content:\n\n${text.slice(0, 12000)}` },
  ]);

  const raw = (response.content ?? "").toString().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("GPT did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

async function storeInPinecone(extractedData, originalName) {
  const pc     = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index  = pc.Index(process.env.PINECONE_INDEX);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
  const store  = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index });

  // Build a rich text block so engineers can search it later
  const text = [
    `Material: ${extractedData.materialName ?? "Unknown"}`,
    `Supplier: ${extractedData.supplier ?? "Unknown"}`,
    `Usage: ${extractedData.recommendedUsage ?? ""}`,
    `Safety: ${(extractedData.safetyNotes ?? []).join("; ")}`,
    `Storage: ${extractedData.storageRequirements ?? ""}`,
    `Compatibility warnings: ${(extractedData.compatibilityWarnings ?? []).join("; ")}`,
    `Specs: ${JSON.stringify(extractedData.specifications ?? {})}`,
  ].join("\n");

  const doc = new Document({
    pageContent: text,
    metadata: {
      source: originalName,
      type: "material_datasheet",
      materialName: extractedData.materialName ?? "unknown",
      supplier: extractedData.supplier ?? "unknown",
      indexedAt: new Date().toISOString(),
    },
  });

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  const chunks   = await splitter.splitDocuments([doc]);
  await store.addDocuments(chunks);

  return chunks.length;
}

// POST /api/analyze-material
// Accepts: multipart/form-data with field "file" (PDF)
router.post("/", async (req, res) => {
  const file = req.file;

  if (!file?.path) return res.status(400).json({ error: "Missing PDF file" });

  const isPdf =
    file.mimetype === "application/pdf" ||
    (file.originalname ?? "").toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    await unlink(file.path).catch(() => undefined);
    return res.status(400).json({ error: "Only PDF datasheets are supported" });
  }

  try {
    // 1. Load PDF text
    const loader = new PDFLoader(file.path);
    const docs   = await loader.load();
    const text   = docs.map((d) => d.pageContent).join("\n\n");

    if (!text.trim()) {
      return res.status(422).json({ error: "Could not extract text from the PDF" });
    }

    // 2. Extract structured data with GPT-4o
    const extracted = await extractWithGPT(text);

    // 3. Store in Pinecone for future chat queries
    let chunksStored = 0;
    try {
      chunksStored = await storeInPinecone(extracted, file.originalname ?? "datasheet.pdf");
    } catch (pineconeErr) {
      console.warn("[analyze-material] Pinecone store failed (non-fatal):", pineconeErr.message);
    }

    await unlink(file.path).catch(() => undefined);

    return res.json({
      ok: true,
      fileName: file.originalname,
      chunksIndexed: chunksStored,
      data: extracted,
    });
  } catch (err) {
    await unlink(file.path).catch(() => undefined);
    console.error("[analyze-material] Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
