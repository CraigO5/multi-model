"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types/chat";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleAppendMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prevMessages) => [...prevMessages, { role, content }]);
  };

  const handleSendMessage = async (content: string) => {
    // Append user message to Chat History
    handleAppendMessage("user", content);

    try {
      // Get OpenRouter completion
      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error("Failed to get OpenRouter completion");
      }

      const data = await response.json();

      handleAppendMessage("assistant", data.completion);
      setUserMessage("");
    } catch (error) {
      console.error("Failed to get OpenRouter completion:", error);
    }
  };

  return (
    <div>
      {/* Chat history */}
      <div>
        {messages.map((message, i) => {
          return (
            <div key={i}>
              <p>{message.content}</p>
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
      />
      <button onClick={() => handleSendMessage(userMessage)}>Send</button>
    </div>
  );
}
