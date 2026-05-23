import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import { searchKnowledgeBaseContext } from "./tools.js";

const MAX_BILL_CHUNKS = 4;
const MAX_CONTEXT_CHARS = 12000;

const extractContent = (message) => {
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }

  return typeof message?.content === "string" ? message.content : "";
};

const uniqueNonEmpty = (values) => [...new Set(values.filter(Boolean))];

const trimToLimit = (text, limit) => text.slice(0, limit);

const buildRetrievalQueries = (chunks) =>
  chunks.slice(0, MAX_BILL_CHUNKS).map((chunk) => trimToLimit(chunk.pageContent, 2000));

const parseJsonResponse = (text) => {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}$/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

export async function analyzeFactoryBill(filePath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  if (docs.length === 0) {
    throw new Error("Unable to extract text from the factory bill");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1800,
    chunkOverlap: 200,
  });
  const billChunks = await splitter.splitDocuments(docs);
  const billText = billChunks.map((chunk) => chunk.pageContent).join("\n\n");

  const retrievalQueries = buildRetrievalQueries(billChunks);
  const retrievedContexts = uniqueNonEmpty(
    await Promise.all(
      retrievalQueries.map((query) => searchKnowledgeBaseContext(query, 5))
    )
  );
  const kbContext = trimToLimit(retrievedContexts.join("\n\n---\n\n"), MAX_CONTEXT_CHARS);

  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0,
  });

  const prompt = [
    {
      role: "system",
      content:
        "You analyze factory bills using the provided bill text and knowledge base context. Return valid JSON only with keys: summary, vendor, billNumber, billDate, currency, subtotal, taxes, total, lineItems, anomalies, matchedKnowledgeBaseHints, recommendedActions, confidence. Keep values concise and practical.",
    },
    {
      role: "user",
      content: `Factory bill text:\n${billText}\n\nRelevant knowledge base context:\n${kbContext || "No matching knowledge base context found."}`,
    },
  ];

  const response = await model.invoke(prompt);
  const rawAnalysis = extractContent(response).trim();
  const parsedAnalysis = parseJsonResponse(rawAnalysis);

  return {
    analysis: parsedAnalysis || rawAnalysis,
    rawAnalysis,
    retrievedContextCount: retrievedContexts.length,
  };
}
