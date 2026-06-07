# Document Ingestion Pipeline

## Overview

The ingestion pipeline converts raw documents (PDFs, text files, Markdown) into vector embeddings stored in **Pinecone**. Once ingested, documents can be searched by the AI agent at query time via semantic similarity.

```
Document file
  → Text extraction (PDF parser / plain text)
  → Text chunking (split into ~500-token segments)
  → Embedding (Pinecone llama-text-embed-v2)
  → Upsert into Pinecone index
  → Stored permanently — searchable by AI agent
```

---

## `ingest.js` — User Document Ingestion

Called by `POST /api/ingest` when a user uploads a file:

```javascript
export async function ingestData(filePath, { originalName, mimeType, fileType }) {
  // Step 1: Extract text from file
  let rawText;
  if (fileType === "pdf") {
    rawText = await extractTextFromPDF(filePath);
  } else {
    rawText = await fs.readFile(filePath, "utf-8");
  }

  // Step 2: Split into overlapping chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunks = await splitter.createDocuments(
    [rawText],
    [{ source: originalName, type: fileType }]   // metadata attached to each chunk
  );

  // Step 3: Embed and store in Pinecone
  const pc = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  await PineconeStore.fromDocuments(chunks, embeddings, { pineconeIndex: index });

  return { chunkCount: chunks.length };
}
```

### Text Chunking Strategy

- **Chunk size:** 500 tokens — large enough to contain meaningful context, small enough to be retrieved precisely
- **Chunk overlap:** 50 tokens — ensures sentences that span chunk boundaries are not cut off
- `RecursiveCharacterTextSplitter` tries to split at paragraph breaks, then newlines, then spaces

### Metadata on Chunks

Each chunk stores the source filename and file type as Pinecone metadata. This lets the AI reference "according to Document X" in its answer.

---

## `ingest-knowledge.js` — Static Knowledge Base Ingestion

Run once (or after knowledge files are updated) to pre-load the factory's static knowledge:

```javascript
const KNOWLEDGE_FILES = [
  "./knowledge/factory-overview.md",
  "./knowledge/api-worker.md",
  "./knowledge/api-engineer.md",
  "./knowledge/api-accountant.md",
  "./knowledge/api-admin.md",
];

async function ingestAll() {
  for (const filePath of KNOWLEDGE_FILES) {
    const text = await fs.readFile(filePath, "utf-8");
    const chunks = await splitter.createDocuments(
      [text],
      [{ source: path.basename(filePath), type: "knowledge-base" }]
    );
    await PineconeStore.fromDocuments(chunks, embeddings, { pineconeIndex: index });
    console.log(`✅ Ingested ${path.basename(filePath)} → ${chunks.length} chunks`);
  }
}
```

Run command: `node ingest-knowledge.js`

---

## Knowledge Base Contents

### `factory-overview.md`
- What Plasticon manufactures (plastic products, types)
- Factory size, number of machines, shift structure
- Quality standards and certifications
- General safety rules

### `api-worker.md`
- Worker-relevant REST API endpoints
- How to log production, electricity, consumption
- Shift check-in/check-out process

### `api-engineer.md`
- Maintenance endpoint documentation
- Spare parts request flow
- Machine health recording
- Quality check procedures

### `api-accountant.md`
- Financial API endpoints
- Payroll calculation logic
- Invoice and expense approval workflows

### `api-admin.md`
- User management endpoints
- System settings
- Shift and machine configuration
- Audit log queries

---

## Pinecone Index Configuration

```
Index name:       process.env.PINECONE_INDEX   (e.g. "plasticon-factory")
Embedding model:  llama-text-embed-v2  (1024-dimensional vectors)
Metric:           cosine similarity
Cloud / Region:   as configured in Pinecone dashboard
```

The same embedding model must be used for both ingestion and querying (enforced in `tools.js`).

---

## Query at Runtime

After ingestion, the AI agent searches the stored vectors:

```javascript
// tools.js — called during agent execution
const results = await store.similaritySearch(query, 10);
// Returns top-10 most semantically similar chunks
// Each result: { pageContent: "...", metadata: { source, type } }
```

The `topK = 10` retrieves up to 10 chunks. The agent receives all of them concatenated and uses them as context when generating its answer.

---

## Re-Ingestion

Documents can be re-ingested if they are updated. Since Pinecone upserts by vector ID (derived from content hash), identical content won't create duplicates. Updated content will create new vectors alongside old ones — a full index wipe and re-ingest is recommended for major updates to the knowledge base.

```bash
# Re-ingest static knowledge after updating markdown files
node ingest-knowledge.js
```
