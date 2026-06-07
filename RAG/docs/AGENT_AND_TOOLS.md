# Agent & Tools

## Overview

The AI brain of the system is a **LangChain agent** powered by **GPT-4o**. The agent decides on its own whether to search the knowledge base (via the `search_knowledge_base` tool) or answer from its training knowledge. Conversation history is preserved per session using a **MemorySaver**.

```
User message
  → agent.invoke({ messages: [{ role: "user", content: enrichedMessage }] })
  → GPT-4o decides: do I need to search?
      → YES: calls searchKnowledgeBase tool
          → Pinecone similarity search (top-10 chunks)
          → chunks returned to GPT-4o as context
          → GPT-4o generates answer using chunks
      → NO: answers from training knowledge directly
  → response.messages[last].content returned
```

---

## `agent.js` — Agent Creation

```javascript
export async function runAgent({ sessionId = "default", message, systemPrompt }) {
  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,          // deterministic answers for factual queries
  });

  const agent = createAgent({
    model,
    tools: [searchKnowledgeBase],   // only one tool: vector search
    checkpointer,                   // MemorySaver for conversation history
    systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  });

  const response = await agent.invoke(
    { messages: [{ role: "user", content: message }] },
    { configurable: { thread_id: sessionId } }  // session isolation
  );

  const output = response.messages.at(-1)?.content ?? "";
  return { output };
}
```

### `temperature: 0`

Zero temperature makes GPT-4o deterministic — it always picks the most probable token. This is appropriate for a factory assistant answering factual questions about machines, procedures, and data.

### `thread_id` — Session Memory

Each call passes a `thread_id` to `MemorySaver`. This maps to a stored conversation history:

```
thread_id: "42-engineer"     (userId=42, role=engineer)
  → History: [
      user: "What is the maintenance schedule for Machine A?",
      assistant: "According to the uploaded manual...",
      user: "What about Machine B?",   ← agent has context from previous turn
      assistant: "Machine B's schedule shows..."
  ]
```

Without `thread_id`, each message would be stateless and the agent could not answer follow-up questions.

---

## `tools.js` — Search Tool

### Vector Store Singleton

```javascript
let vectorStore;

const getVectorStore = async () => {
  if (vectorStore) return vectorStore;  // reuse across requests — expensive to init

  const pc = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX);
  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });

  vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index });
  return vectorStore;
};
```

The vector store connection is initialized once (lazy singleton). Subsequent requests reuse the same instance, avoiding the ~500ms connection overhead on every chat message.

### `searchKnowledgeBase` Tool Definition

```javascript
export const searchKnowledgeBase = tool(
  async ({ query }) => {
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, 10);

    if (results.length === 0) return "No relevant information found.";

    return results.map(doc => doc.pageContent).join("\n\n---\n\n");
  },
  {
    name: "search_knowledge_base",
    description:
      "Searches the Plasticon factory knowledge base for information from uploaded documents. " +
      "Use this for: machine manuals, technical procedures, raw material datasheets, safety guidelines, " +
      "maintenance SOPs, quality standards, factory policies, and any document the user or admin has uploaded. " +
      "Always search before answering questions about factory processes, equipment, or stored documents.",
    schema: z.object({
      query: z.string().describe("The search query — be specific about the machine, material, or procedure you need"),
    }),
  }
);
```

The `description` is crucial — GPT-4o reads it to decide when to invoke the tool. The instruction "Always search before answering questions about factory processes..." encourages the agent to look up real data rather than hallucinate.

### `searchKnowledgeBaseContext` (direct access)

```javascript
export async function searchKnowledgeBaseContext(query, topK = 10) {
  const store = await getVectorStore();
  const results = await store.similaritySearch(query, topK);
  return results.map(doc => doc.pageContent).join("\n\n---\n\n");
}
```

Called directly (not via the agent) when non-chat endpoints need knowledge base lookups.

---

## `billAnalysis.js` — Specialized Document Analyzer

For factory electricity/utility bills (PDFs):

```javascript
export async function analyzeFactoryBill(pdfPath) {
  // Step 1: Extract text from PDF
  const text = await extractTextFromPDF(pdfPath);

  // Step 2: Search knowledge base for context about this type of bill
  const kbContext = await searchKnowledgeBaseContext("electricity bill utility cost analysis", 5);

  // Step 3: Build a specific prompt for bill analysis
  const prompt = `
    You are a financial analyst for a plastic factory.
    Analyze the following utility bill and extract:
    1. Total amount due
    2. Billing period
    3. kWh consumed
    4. Cost per kWh
    5. Any line-item fees
    6. Recommendations for reducing cost

    Knowledge base context:
    ${kbContext}

    Bill content:
    ${text}
  `;

  // Step 4: Call GPT-4o directly (no agent loop needed — single extraction task)
  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(result.choices[0].message.content);
}
```

Bill analysis uses a **direct GPT-4o call** (not the agent loop) because it's a single structured extraction task — no multi-step reasoning or tool calls needed.

---

## Agent vs. Direct Call

| Scenario | Approach |
|---|---|
| Conversational assistant | Agent loop — multi-turn, uses tools, remembers history |
| Bill analysis | Direct GPT-4o call — one-shot extraction, structured JSON output |
| Material analysis | Direct GPT-4o call — specialized prompt for datasheets |
| Production summary | Direct GPT-4o call — formats live data into readable prose |

The agent approach is heavier but supports multi-turn conversations and dynamic tool use. Direct calls are faster for deterministic extraction tasks.
