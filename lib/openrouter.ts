import type { ChatMessage } from "@/types/chat";
import { OpenRouter } from "@openrouter/sdk";

export async function getOpenRouterCompletion(
  model: string,
  messages: ChatMessage[],
) {
  const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  console.log("Sending messages to OpenRouter:", messages);

  const completion = await client.chat.send({
    chatRequest: {
      model,
      messages,
    },
  });

  if (!completion) {
    throw new Error("OpenRouter returned an empty completion");
  }

  const content = completion.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter returned a non-text or empty completion");
  }

  return content;
}
