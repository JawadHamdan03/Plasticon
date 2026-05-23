import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { readFile } from "node:fs/promises";
import path from "node:path";

const TEXT_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".xml",
  ".yaml",
  ".yml",
  ".log",
  ".css",
  ".scss",
  ".less",
  ".env",
  ".sql",
]);

const toDocument = (pageContent, metadata) =>
  new Document({
    pageContent,
    metadata,
  });

async function loadFileDocuments(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const loader = new PDFLoader(filePath);
    return loader.load();
  }

  const rawContent = await readFile(filePath, "utf8");
  const normalizedContent = rawContent.replace(/\u0000/g, "").trim();

  if (!normalizedContent) {
    throw new Error("Uploaded file did not contain readable text");
  }

  return [
    toDocument(normalizedContent, {
      source: filePath,
      fileType: TEXT_FILE_EXTENSIONS.has(ext) ? ext.slice(1) : "text",
    }),
  ];
}

export const ingestData = async (filePath, metadata = {}) => {
  const docs = await loadFileDocuments(filePath);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  const enrichedChunks = chunks.map((chunk) =>
    toDocument(chunk.pageContent, {
      ...chunk.metadata,
      ...metadata,
    })
  );

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX);

  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  const BATCH_SIZE = 96;
  for (let i = 0; i < enrichedChunks.length; i += BATCH_SIZE) {
    const batch = enrichedChunks.slice(i, i + BATCH_SIZE);
    await store.addDocuments(batch);
  }

  return {
    chunkCount: enrichedChunks.length,
    fileType: metadata.fileType || "unknown",
  };
};
