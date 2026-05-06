"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { MODELS } from "@/lib/models";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [model, setModel] = useState("openai/gpt-4o-mini");

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const fetchCompletion = async (
    nextMessages: ChatMessage[],
    model: string,
  ) => {
    const response = await fetch("/api/openrouter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: nextMessages, model }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get OpenRouter completion: ${response.statusText}`,
      );
    }

    const data = await response.json();

    return data.completion;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setUserMessage("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content };
    appendMessage(userMsg);
    const nextMessages: ChatMessage[] = [...messages, userMsg];

    setIsLoading(true);
    // Get OpenRouter completion
    console.log("Sending messages to OpenRouter:", nextMessages);

    try {
      for (const model of MODELS) {
        const completion = await fetchCompletion(nextMessages, model.id);

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: completion,
          model: model.id,
        };

        appendMessage(assistantMsg);
      }
    } catch (error) {
      console.error("Failed to get OpenRouter completion:", error);
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Chat history */}
      <div>
        {messages.map((message, i) => {
          return (
            <div key={i}>
              <p>
                {message.model ? `${message.model}: ` : "You: "}{" "}
                {message.content}
              </p>
            </div>
          );
        })}
      </div>

      {/* Input field */}
      <input
        type="text"
        placeholder="Send a message..."
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSendMessage(userMessage);
          }
        }}
        disabled={isLoading}
      />
      <button
        onClick={() => handleSendMessage(userMessage)}
        disabled={isLoading}
      >
        {isLoading ? "Sending..." : "Send"}
      </button>
      <button onClick={() => clearMessages()}>Clear</button>

      {/* Model selector */}
      {/* <select
        name="model"
        id="model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {MODELS.map((model) => {
          return (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          );
        })}
      </select> */}

      {/* Error message */}
      {error && <p>{`Error: ${error}`}</p>}
    </div>
  );
}
