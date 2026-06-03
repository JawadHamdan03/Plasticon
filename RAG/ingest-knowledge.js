import "dotenv/config";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { ingestData } from "./ingest.js";

const KNOWLEDGE_DIR = path.join(import.meta.dirname, "knowledge");

async function main() {
  const files = (await readdir(KNOWLEDGE_DIR)).filter(
    (f) => f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".json")
  );

  if (files.length === 0) {
    console.log("No files found in knowledge/");
    return;
  }

  console.log(`📚 Ingesting ${files.length} knowledge file(s) into Pinecone...\n`);

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    try {
      const result = await ingestData(filePath, {
        originalName: file,
        fileType: path.extname(file).slice(1),
        source: "knowledge-base",
      });
      console.log(`✅ ${file} — ${result.chunkCount} chunks`);
    } catch (err) {
      console.error(`❌ ${file} — ${err.message}`);
    }
  }

  console.log("\n🎉 Done. Knowledge base is ready.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
