"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prevMessages) => [...prevMessages, { role, content }]);
    setInputMessage("");
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
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSendMessage("user", inputMessage);
          }
        }}
      />
      <button onClick={() => handleSendMessage("user", inputMessage)}>
        Send
      </button>
    </div>
  );
}
