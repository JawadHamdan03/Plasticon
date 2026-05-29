import { tool } from "langchain";
import { z } from "zod";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

let vectorStore;

const getVectorStore = async () => {
  if (vectorStore) return vectorStore;

  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY");
  }
  if (!indexName) {
    throw new Error("Missing PINECONE_INDEX");
  }

  const pc = new PineconeClient({ apiKey });
  const index = pc.Index(indexName);

  // This MUST match the embedding model used during ingestion
  const embeddings = new PineconeEmbeddings({
    model: "llama-text-embed-v2",
  });

  vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  return vectorStore;
};

export async function searchKnowledgeBaseContext(query, topK = 10) {
  const store = await getVectorStore();
  const results = await store.similaritySearch(query, topK);

  if (results.length === 0) {
    return "";
  }

  return results.map((doc) => doc.pageContent).join("\n\n---\n\n");
}

export const searchKnowledgeBase = tool(
  async ({ query }) => {
    console.log(`🔍 Agent is searching Pinecone for: "${query}"`);

    const context = await searchKnowledgeBaseContext(query, 10);

    if (!context) {
      return "No relevant information found in the knowledge base.";
    }

    return context;
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
