import type { ChatMessage } from "@/types/chat";
import { OpenRouter } from "@openrouter/sdk";
import { MAX_TOKENS_PER_RESPONSE } from "@/lib/models";

export async function getOpenRouterCompletion(
  model: string,
  messages: ChatMessage[],
  prompt: string | null = null,
) {
  const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const allMessages = prompt
    ? [{ role: "system" as const, content: prompt }, ...messages]
    : messages;

  console.log("Sending messages to OpenRouter:", allMessages);

  const completion = await client.chat.send({
    chatRequest: {
      model,
      messages: allMessages,
      maxTokens: MAX_TOKENS_PER_RESPONSE,
    },
  });

  if (!completion) {
    throw new Error("OpenRouter returned an empty completion");
  }

  const content = completion.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter returned a non-text or empty completion");
  }

  return {
    content,
    usage: {
      promptTokens: completion.usage?.promptTokens ?? 0,
      completionTokens: completion.usage?.completionTokens ?? 0,
    },
  };
}
