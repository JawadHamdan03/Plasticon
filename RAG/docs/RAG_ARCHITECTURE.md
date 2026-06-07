# RAG System Architecture

## Overview

The RAG (Retrieval-Augmented Generation) system is a **standalone Express server** running on **port 3001**, separate from the main backend (port 8080). It provides AI-powered features to the frontend: a conversational assistant, invoice data extraction, raw material analysis, production summaries, and factory bill analysis.

```
Frontend (5173)
  ├── POST /api/chat               → RAG server :3001
  ├── POST /api/ingest             → RAG server :3001
  ├── POST /api/analyze-material   → RAG server :3001
  ├── POST /api/production-summary → RAG server :3001
  └── POST /api/analyze-factory-bill → RAG server :3001

RAG server :3001
  ├── Pinecone                (vector database — knowledge storage)
  ├── OpenAI GPT-4o           (LLM for generation)
  ├── LangChain               (agent framework)
  └── Main Backend :8080      (live factory data)
```

---

## Entry Point — `index.js`

### Server Setup

```javascript
app.use(cors({ origin: ragAllowedOrigins, credentials: true }));
app.use(express.json());
app.listen(3001);
```

Same CORS origin list as the main backend (read from `FRONTEND_ORIGIN` env var + hardcoded localhost defaults).

### File Upload — Multer

All document endpoints accept file uploads via `multipart/form-data`:

```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),       // temp directory
    filename: (req, file, cb) => cb(null, `${Date.now()}-${randomHex}${ext}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }  // 25 MB max
});
```

After processing, each handler deletes the temp file with `unlink()` to prevent disk accumulation.

---

## HTTP Endpoints

### `POST /api/chat` (or `/api/rag/chat`)
Chat with the AI assistant. The body contains `{ message, sessionId?, userId?, role? }`.

Full flow is documented in `ROLE_CONTEXT_AND_PROMPTS.md`.

### `POST /api/ingest` (or `/api/rag/ingest`)
Upload a document (PDF, text, etc.) to be embedded and stored in the knowledge base.

```
Client uploads file
  → multer saves to /tmp
  → ingestData(filePath, metadata) called
  → file parsed into text chunks
  → each chunk embedded via Pinecone llama-text-embed-v2
  → chunks stored in Pinecone index
  → temp file deleted
  → { ok: true, fileName, chunkCount } returned
```

### `POST /api/analyze-material`
Accepts a PDF datasheet for a raw material. Returns structured analysis:
- Material name and composition
- Storage conditions
- Recommended usage quantities
- Supplier compatibility notes

### `POST /api/production-summary`
No file upload. Fetches live data from the main backend and generates a human-readable production summary for the current/specified shift.

### `POST /api/analyze-factory-bill`
Accepts a factory electricity/utility PDF bill. Returns:
- Total amount
- Billing period
- Line-item breakdown
- kWh consumption
- Recommendations for cost reduction

Validates that the file is actually a PDF (checks mimetype and extension) before processing.

---

## Technology Stack

| Component | Library / Service |
|---|---|
| Web framework | Express.js |
| LLM | OpenAI GPT-4o via `@langchain/openai` |
| Agent framework | LangChain + LangGraph (`langchain`, `@langchain/langgraph`) |
| Conversation memory | LangGraph `MemorySaver` (in-process, per-session) |
| Vector database | Pinecone (`@pinecone-database/pinecone`) |
| Embedding model | Pinecone `llama-text-embed-v2` |
| File handling | multer + Node.js `fs/promises` |
| PDF parsing | Handled inside `ingest.js` |

---

## Environment Variables

```
OPENAI_API_KEY       OpenAI API key for GPT-4o
PINECONE_API_KEY     Pinecone project API key
PINECONE_INDEX       Name of the Pinecone index (e.g. "plasticon-factory")
FRONTEND_ORIGIN      Comma-separated allowed origins (same as main backend)
API_BASE_URL         URL of the main backend (e.g. http://localhost:8080)
                     Used to fetch live factory data
```

---

## Relationship to Main Backend

The RAG server calls the main backend for live data:

```
RAG :3001 → GET http://localhost:8080/api/rag-context?userId=X
                                                  (via services/backendAPI.js)
         ← { user, shift, attendance, maintenance, notifications }

RAG :3001 → GET http://localhost:8080/api/production-summary?date=X&shift=Y
         ← { totalPieces, totalCartons, totalDowntime, totalKwh, ... }
```

This means the RAG server always has access to real-time factory state without maintaining its own database connection.

---

## Knowledge Base

The `/knowledge` folder contains static Markdown files that are pre-loaded into Pinecone when `ingest-knowledge.js` is run:

```
knowledge/
├── factory-overview.md     General factory description + products
├── api-worker.md          Worker-relevant API documentation
├── api-engineer.md        Engineer-relevant API documentation
├── api-accountant.md      Accountant-relevant API documentation
└── api-admin.md           Admin-relevant API documentation
```

These files give the AI assistant a baseline understanding of the factory before any user documents are uploaded.
