"use client";

import { useState } from "react";
import type { ChatMessage, Model } from "@/types/chat";
import { MODELS } from "@/lib/models";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([MODELS[0]]);
  const [prompt, setPrompt] = useState<string | null>(null);

  const addModel = (model: Model) => {
    setModels((prev) => [...prev, model]);
  };

  const removeModel = (model: Model) => {
    setModels((prev) => prev.filter((m) => m.id !== model.id));
  };

  const appendMessage = (message: ChatMessage) => {
    const modelKey = message.model ?? "default";

    setMessages((prev) => [...prev, message]);
    setMessagesMap((prev) => ({
      ...prev,
      [modelKey]: [...(prev[modelKey] ?? []), message],
    }));
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const fetchCompletion = async (
    nextMessages: ChatMessage[],
    model: string,
    prompt: string | null,
  ) => {
    const response = await fetch("/api/openrouter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: nextMessages, model, prompt }),
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
      await Promise.allSettled(
        models.map(async (model) => {
          const modelMessages = nextMessages.filter(
            (m) => m.role === "user" || m.model === model.id,
          );
          const completion = await fetchCompletion(
            modelMessages,
            model.id,
            prompt,
          );
          appendMessage({
            role: "assistant",
            content: completion,
            model: model.id,
          });
        }),
      );
    } catch (error) {
      console.error("Failed to get OpenRouter completion:", error);
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col h-screen">
        {/* Header */}
        <div className="px-0 pt-10 pb-6 flex items-end justify-between shrink-0">
          <h1 className="text-xl font-light tracking-tight text-zinc-100">
            Multi-Model
          </h1>
          <button
            onClick={() => clearMessages()}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-6">
          {messages.length === 0 && (
            <p className="text-zinc-600 text-sm mt-16 select-none">
              Ask anything. All models will respond.
            </p>
          )}
          {messages.map((message, i) => {
            return (
              <div
                key={i}
                className={`flex flex-col ${message.model ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] ${message.model ? "space-y-1" : ""}`}
                >
                  {message.model && (() => {
                    const meta = MODELS.find((m) => m.id === message.model);
                    return (
                      <div className="flex items-center gap-1.5">
                        {meta && (
                          <img src={meta.icon} alt={meta.name} className="w-3.5 h-3.5 rounded-sm" />
                        )}
                        <p className="text-[11px] text-zinc-600 tracking-wide uppercase">
                          {meta?.name ?? message.model}
                        </p>
                      </div>
                    );
                  })()}
                  <p
                    className={`text-sm leading-relaxed ${
                      message.model
                        ? "text-zinc-300"
                        : "bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5"
                    }`}
                  >
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-1.5 items-center">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="flex flex-wrap gap-2 pb-4 shrink-0">
          {MODELS.map((model) => {
            const active = models.some((m) => m.id === model.id);
            return (
              <button
                key={model.id}
                onClick={() => (active ? removeModel(model) : addModel(model))}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  active
                    ? "border-zinc-500 text-zinc-200 bg-zinc-800"
                    : "border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
                }`}
              >
                <img src={model.icon} alt={model.name} className="w-3.5 h-3.5 rounded-sm" />
                {active ? `${model.name} ×` : `+ ${model.name}`}
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-xs pb-2">{`Error: ${error}`}</p>
        )}

        {/* Input field */}
        <div className="border-t border-zinc-800 py-4 flex gap-3 shrink-0">
          <input
            type="text"
            placeholder="Message..."
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage(userMessage);
              }
            }}
            disabled={isLoading}
            className="flex-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none bg-transparent disabled:opacity-40"
          />
          <button
            onClick={() => handleSendMessage(userMessage)}
            disabled={isLoading}
            className="text-sm text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? "···" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
