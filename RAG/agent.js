import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { searchKnowledgeBase } from "./tools.js";

// Create a memory saver for persisting conversation history
const checkpointer = new MemorySaver();

const DEFAULT_SYSTEM_PROMPT =
  `You are a helpful AI assistant with access to a general knowledge base built from uploaded files.
   When users ask questions, search the knowledge base using the available tools to find relevant information.
   Be concise and accurate.`;

export async function runAgent({ sessionId = "default", message, systemPrompt }) {
  try {
    const model = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0,
    });

    const agent = createAgent({
      model,
      tools: [searchKnowledgeBase],
      checkpointer,
      systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    });

    console.log(`🤖 Running agent for: "${message}"`);

    // Invoke here has an agentic behavior and it will decide to use the tool or not.
    const response = await agent.invoke(
      {
        messages: [{ role: "user", content: message }],
      },
      {
        configurable: {
          thread_id: sessionId, // This maintains conversation history per session
        },
      }
    );

    // Extract the last message content
    const lastMessage = response.messages[response.messages.length - 1];
    const output = lastMessage?.content || "";

    console.log(`✅ Agent response: ${output.slice(0, 100)}...`);

    return { output };
  } catch (error) {
    console.error("❌ Error in runAgent:", error);
    throw error;
  }
}
