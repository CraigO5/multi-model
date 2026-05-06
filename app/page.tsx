"use client";

import { useEffect, useState } from "react";
import type { Chat, ChatMessage, Model } from "@/types/chat";
import {
  DAILY_LIMIT_CREDITS,
  DAILY_LIMIT_USD,
  MODELS,
  USD_PER_CREDIT,
} from "@/lib/models";

type Slot = {
  modelId: string;
  preSplitMessages: ChatMessage[];
  postSplitMessages: ChatMessage[];
  input: string;
  isLoading: boolean;
};

// Icon components
const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SendIcon = () => (
  <svg {...iconProps}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const SplitIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="1.5" />
  </svg>
);

const MergeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6l6 6-6 6M21 6l-6 6 6 6" />
  </svg>
);

const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TrashIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);

const todayKey = () => new Date().toISOString().slice(0, 10);

const usdToCredits = (usd: number) => usd / USD_PER_CREDIT;

const formatCredits = (credits: number) => {
  if (credits === 0) return "0";
  if (credits < 1) return credits.toFixed(2);
  if (credits < 100) return credits.toFixed(1);
  return Math.round(credits).toLocaleString();
};

const isPaid = (modelId: string) => {
  const m = MODELS.find((x) => x.id === modelId);
  if (!m) return false;
  return m.pricing.prompt > 0 || m.pricing.completion > 0;
};

const computeCost = (
  modelId: string,
  promptTokens: number,
  completionTokens: number,
) => {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return 0;
  return (
    (promptTokens * model.pricing.prompt +
      completionTokens * model.pricing.completion) /
    1_000_000
  );
};

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([MODELS[0]]);

  // Persistence
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dailySpend, setDailySpend] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // Split state
  const [isSplit, setIsSplit] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [mergingFrom, setMergingFrom] = useState<number | null>(null);

  // Rate-limit tracking: modelId → reset timestamp (ms)
  const [rateLimited, setRateLimited] = useState<Record<string, number>>({});
  const [showAllModels, setShowAllModels] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tick, setTick] = useState(0);

  const isRateLimited = (modelId: string) => {
    const reset = rateLimited[modelId];
    return reset !== undefined && reset > Date.now();
  };

  const rateLimitMinsLeft = (modelId: string) => {
    const reset = rateLimited[modelId];
    if (!reset) return 0;
    return Math.max(0, Math.ceil((reset - Date.now()) / 60_000));
  };

  // Derived
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages: ChatMessage[] = activeChat?.messages ?? [];
  const overLimit = dailySpend >= DAILY_LIMIT_USD;

  const totalUsage = messages.reduce(
    (acc, m) => {
      if (m.usage) {
        acc.tokens += m.usage.promptTokens + m.usage.completionTokens;
        acc.cost += m.usage.cost;
      }
      return acc;
    },
    { tokens: 0, cost: 0 },
  );

  // ─── Hydration from localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem("chats");
      if (storedChats) {
        const parsed: Chat[] = JSON.parse(storedChats);
        setChats(parsed);
        if (parsed.length > 0) setActiveChatId(parsed[0].id);
      }
      const storedPrompt = localStorage.getItem("systemPrompt");
      if (storedPrompt) setSystemPrompt(storedPrompt);

      const storedSpend = localStorage.getItem("dailySpend");
      if (storedSpend) {
        const parsed = JSON.parse(storedSpend);
        if (parsed.date === todayKey()) setDailySpend(parsed.amount);
      }
      const storedRL = localStorage.getItem("rateLimited");
      if (storedRL) {
        const parsed: Record<string, number> = JSON.parse(storedRL);
        const cleaned = Object.fromEntries(
          Object.entries(parsed).filter(([, ts]) => ts > Date.now()),
        );
        setRateLimited(cleaned);
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    setHydrated(true);

    // Tick every 30s so countdown displays update + expired RL clear themselves
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("rateLimited", JSON.stringify(rateLimited));
  }, [rateLimited, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("systemPrompt", systemPrompt);
  }, [systemPrompt, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "dailySpend",
      JSON.stringify({ date: todayKey(), amount: dailySpend }),
    );
  }, [dailySpend, hydrated]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const ensureChat = (firstMessage: string): string => {
    if (activeChatId) return activeChatId;
    const id = crypto.randomUUID();
    const chat: Chat = {
      id,
      title: firstMessage.slice(0, 40) || "New chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
    return id;
  };

  const appendToChat = (chatId: string, message: ChatMessage) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
          : c,
      ),
    );
  };

  const newChat = () => {
    setActiveChatId(null);
    setIsSplit(false);
    setSlots([]);
  };

  const switchChat = (id: string) => {
    setActiveChatId(id);
    setIsSplit(false);
    setSlots([]);
  };

  const deleteChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setIsSplit(false);
      setSlots([]);
    }
  };

  const addModel = (model: Model) => {
    if (models.length >= 3) return;
    setModels((prev) => [...prev, model]);
  };

  const removeModel = (model: Model) => {
    setModels((prev) => prev.filter((m) => m.id !== model.id));
  };

  const fetchCompletion = async (
    nextMessages: ChatMessage[],
    model: string,
    prompt: string | null,
  ) => {
    const response = await fetch("/api/openrouter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages, model, prompt }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      throw new Error(
        `Failed to get OpenRouter completion: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      completion: data.completion as string,
      usage: data.usage as { promptTokens: number; completionTokens: number },
    };
  };

  const markRateLimited = (modelId: string) => {
    // Free models reset daily, paid usually shorter. Use 1 hour as default.
    const resetIn = isPaid(modelId) ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
    setRateLimited((prev) => ({ ...prev, [modelId]: Date.now() + resetIn }));
    setModels((prev) => prev.filter((m) => m.id !== modelId));
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || overLimit) return;

    setUserMessage("");
    setError(null);

    const chatId = ensureChat(content);
    const userMsg: ChatMessage = { role: "user", content };
    appendToChat(chatId, userMsg);

    const baseMessages = chats.find((c) => c.id === chatId)?.messages ?? [];
    const nextMessages = [...baseMessages, userMsg];

    setIsLoading(true);

    await Promise.allSettled(
      models.map(async (model) => {
        try {
          const modelMessages = nextMessages.filter(
            (m) => m.role === "user" || m.model === model.id,
          );
          const result = await fetchCompletion(
            modelMessages,
            model.id,
            systemPrompt || null,
          );
          const cost = computeCost(
            model.id,
            result.usage.promptTokens,
            result.usage.completionTokens,
          );
          appendToChat(chatId, {
            role: "assistant",
            content: result.completion,
            model: model.id,
            usage: { ...result.usage, cost },
          });
          setDailySpend((prev) => prev + cost);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          if (msg === "RATE_LIMIT") {
            markRateLimited(model.id);
            appendToChat(chatId, {
              role: "assistant",
              model: model.id,
              content: "⚠ Rate limit hit. Model disabled until it resets.",
            });
          } else {
            appendToChat(chatId, {
              role: "assistant",
              model: model.id,
              content: `⚠ ${msg}`,
            });
          }
        }
      }),
    );
    setIsLoading(false);
  };

  const handleSplit = () => {
    const newSlots: Slot[] = models.map((model) => ({
      modelId: model.id,
      preSplitMessages: messages.filter(
        (m) => m.role === "user" || m.model === model.id,
      ),
      postSplitMessages: [],
      input: "",
      isLoading: false,
    }));
    setSlots(newSlots);
    setIsSplit(true);
    setSwapSlot(null);
  };

  const handleMerge = (slotIndex: number) => {
    if (mergingFrom !== null) return;
    setMergingFrom(slotIndex);
    setSwapSlot(null);
    // Wait for collapse animation, then commit the merge
    setTimeout(() => {
      const slot = slots[slotIndex];
      if (slot && activeChatId) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: [...c.messages, ...slot.postSplitMessages],
                  updatedAt: Date.now(),
                }
              : c,
          ),
        );
      }
      setSlots([]);
      setIsSplit(false);
      setMergingFrom(null);
    }, 380);
  };

  const handleSwapModel = (slotIndex: number, newModelId: string) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === slotIndex ? { ...slot, modelId: newModelId } : slot,
      ),
    );
    setSwapSlot(null);
  };

  const handleSplitSend = async (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot.input.trim() || slot.isLoading || overLimit) return;

    const userMsg: ChatMessage = { role: "user", content: slot.input };

    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIndex
          ? {
              ...s,
              input: "",
              isLoading: true,
              postSplitMessages: [...s.postSplitMessages, userMsg],
            }
          : s,
      ),
    );

    const fullHistory = [
      ...slot.preSplitMessages,
      ...slot.postSplitMessages,
      userMsg,
    ];

    try {
      const result = await fetchCompletion(
        fullHistory,
        slot.modelId,
        systemPrompt || null,
      );
      const cost = computeCost(
        slot.modelId,
        result.usage.promptTokens,
        result.usage.completionTokens,
      );
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.completion,
        model: slot.modelId,
        usage: { ...result.usage, cost },
      };
      setSlots((prev) =>
        prev.map((s, i) =>
          i === slotIndex
            ? {
                ...s,
                isLoading: false,
                postSplitMessages: [...s.postSplitMessages, assistantMsg],
              }
            : s,
        ),
      );
      setDailySpend((prev) => prev + cost);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "RATE_LIMIT") markRateLimited(slot.modelId);
      const errMsg: ChatMessage = {
        role: "assistant",
        model: slot.modelId,
        content:
          msg === "RATE_LIMIT"
            ? "⚠ Rate limit hit. Model disabled until it resets."
            : `⚠ ${msg}`,
      };
      setSlots((prev) =>
        prev.map((s, i) =>
          i === slotIndex
            ? {
                ...s,
                isLoading: false,
                postSplitMessages: [...s.postSplitMessages, errMsg],
              }
            : s,
        ),
      );
    }
  };

  // ─── Sub-renderers ────────────────────────────────────────────────────────
  const sidebar = (
    <aside className="w-64 border-r border-zinc-800 flex flex-col shrink-0 bg-zinc-950">
      <div className="p-3 border-b border-zinc-800">
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors text-zinc-400 cursor-pointer"
        >
          <PlusIcon />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 && (
          <p className="text-xs text-zinc-700 text-center mt-4">No chats yet</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => switchChat(chat.id)}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              activeChatId === chat.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span className="text-xs truncate flex-1">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              title="Delete"
              className="text-zinc-700 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 p-3 space-y-3">
        {/* Daily spend */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span className="uppercase tracking-wider">Today</span>
            <span className={overLimit ? "text-red-400" : ""}>
              {formatCredits(usdToCredits(dailySpend))} /{" "}
              {DAILY_LIMIT_CREDITS.toLocaleString()} credits
            </span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                overLimit
                  ? "bg-red-500"
                  : dailySpend / DAILY_LIMIT_USD > 0.75
                    ? "bg-yellow-500"
                    : "bg-zinc-500"
              }`}
              style={{
                width: `${Math.min(100, (dailySpend / DAILY_LIMIT_USD) * 100)}%`,
              }}
            />
          </div>
          {overLimit && (
            <p className="text-[10px] text-red-400">
              Limit reached. Resets at midnight.
            </p>
          )}
        </div>

        {/* System prompt */}
        <div>
          <button
            onClick={() => setShowSystemPrompt((s) => !s)}
            className="w-full text-left text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider cursor-pointer"
          >
            System prompt {showSystemPrompt ? "▾" : "▸"}
          </button>
          {showSystemPrompt && (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={4}
              className="mt-2 w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 resize-none"
            />
          )}
        </div>
      </div>
    </aside>
  );

  // ─── Split view ───────────────────────────────────────────────────────────
  if (isSplit) {
    return (
      <div
        className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden"
        onClick={() => setSwapSlot(null)}
      >
        {sidebar}
        <div className="flex-1 flex overflow-hidden">
          {slots.map((slot, slotIndex) => {
            const meta = MODELS.find((m) => m.id === slot.modelId);
            const isSwapOpen = swapSlot === slotIndex;

            return (
              <div
                key={slotIndex}
                className={`flex flex-col border-r border-zinc-800 last:border-r-0 min-w-0 ${
                  mergingFrom !== null
                    ? "animate-panel-out"
                    : "animate-panel-in"
                }`}
                style={{
                  flexGrow:
                    mergingFrom !== null
                      ? mergingFrom === slotIndex
                        ? 1
                        : 0
                      : hoveredSlot === null
                        ? 1
                        : hoveredSlot === slotIndex
                          ? 1.01
                          : 0.99,
                  flexBasis: 0,
                  transition: "flex-grow 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  animationDelay:
                    mergingFrom !== null
                      ? `${(slots.length - 1 - slotIndex) * 30}ms`
                      : `${slotIndex * 60}ms`,
                }}
                onMouseEnter={() => setHoveredSlot(slotIndex)}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                {/* Panel header */}
                <div className="px-4 pt-5 pb-4 border-b border-zinc-800 shrink-0 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapSlot(isSwapOpen ? null : slotIndex);
                    }}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    {meta && (
                      <img
                        src={meta.icon}
                        alt={meta.name}
                        className="w-4 h-4 rounded-sm"
                      />
                    )}
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {meta?.name ?? slot.modelId}
                    </span>
                    <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
                      ▾
                    </span>
                  </button>
                  {meta && (
                    <p className="text-[10px] mt-1">
                      <span className={isPaid(meta.id) ? "text-amber-600/70" : "text-zinc-600"}>
                        {isPaid(meta.id) ? "★ Premium · " : "Free · "}
                      </span>
                      <span className="text-zinc-600">
                        {formatCredits(usdToCredits(meta.pricing.prompt))} in ·{" "}
                        {formatCredits(usdToCredits(meta.pricing.completion))} out
                        credits/1M
                      </span>
                    </p>
                  )}

                  {isSwapOpen && (
                    <div
                      className="absolute top-full left-4 mt-1 z-10 bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col gap-1 animate-panel-in shadow-xl min-w-56"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {MODELS.map((m) => {
                        const limited = isRateLimited(m.id);
                        const paid = isPaid(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() =>
                              !limited && handleSwapModel(slotIndex, m.id)
                            }
                            disabled={limited}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors w-full text-left ${
                              limited
                                ? "text-zinc-700 line-through cursor-not-allowed"
                                : m.id === slot.modelId
                                  ? "bg-zinc-800 text-zinc-200 cursor-pointer"
                                  : paid
                                    ? "text-amber-600/80 hover:bg-amber-950/30 hover:text-amber-300 cursor-pointer"
                                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={m.icon}
                                alt={m.name}
                                className="w-3.5 h-3.5 rounded-sm"
                              />
                              {paid && (
                                <span className="text-[9px] text-amber-600">
                                  ★
                                </span>
                              )}
                              {m.name}
                            </div>
                            <span className="text-[10px] text-zinc-600">
                              {limited
                                ? `${rateLimitMinsLeft(m.id)}m`
                                : `${formatCredits(usdToCredits(m.pricing.prompt))}/${formatCredits(usdToCredits(m.pricing.completion))}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                  {slot.preSplitMessages.map((message, j) => {
                    const msgMeta = message.model
                      ? MODELS.find((m) => m.id === message.model)
                      : null;
                    return (
                      <div
                        key={j}
                        className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                      >
                        {msgMeta && (
                          <div className="flex items-center gap-1 mb-1">
                            <img
                              src={msgMeta.icon}
                              alt={msgMeta.name}
                              className="w-3 h-3 rounded-sm"
                            />
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
                              {msgMeta.name}
                            </span>
                          </div>
                        )}
                        <p
                          className={`text-sm leading-relaxed max-w-[90%] ${
                            message.role === "user"
                              ? "bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5"
                              : "text-zinc-300"
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    );
                  })}

                  {slot.preSplitMessages.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-zinc-800" />
                      <span className="text-[10px] text-zinc-700 tracking-widest uppercase select-none">
                        Split
                      </span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                  )}

                  {slot.postSplitMessages.map((message, j) => {
                    const msgMeta = message.model
                      ? MODELS.find((m) => m.id === message.model)
                      : null;
                    return (
                      <div
                        key={`post-${j}`}
                        className={`flex flex-col animate-msg-in ${message.role === "user" ? "items-end" : "items-start"}`}
                      >
                        {msgMeta && (
                          <div className="flex items-center gap-1 mb-1">
                            <img
                              src={msgMeta.icon}
                              alt={msgMeta.name}
                              className="w-3 h-3 rounded-sm"
                            />
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
                              {msgMeta.name}
                            </span>
                          </div>
                        )}
                        <p
                          className={`text-sm leading-relaxed max-w-[90%] ${
                            message.role === "user"
                              ? "bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5"
                              : "text-zinc-300"
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    );
                  })}

                  {slot.isLoading && (
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

                {/* Input + merge */}
                <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
                  <input
                    type="text"
                    placeholder={
                      overLimit ? "Daily limit reached" : "Message..."
                    }
                    value={slot.input}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s, i) =>
                          i === slotIndex ? { ...s, input: e.target.value } : s,
                        ),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSplitSend(slotIndex);
                    }}
                    disabled={slot.isLoading || overLimit}
                    className="flex-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none bg-transparent disabled:opacity-40 min-w-0"
                  />
                  <button
                    onClick={() => handleSplitSend(slotIndex)}
                    disabled={slot.isLoading || overLimit}
                    title="Send"
                    className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30 transition-colors cursor-pointer shrink-0 p-1"
                  >
                    {slot.isLoading ? (
                      <span className="text-xs">···</span>
                    ) : (
                      <SendIcon />
                    )}
                  </button>
                  <div className="w-px h-3 bg-zinc-800 shrink-0" />
                  <button
                    onClick={() => handleMerge(slotIndex)}
                    title="Merge into main chat"
                    className="text-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 p-1"
                  >
                    <MergeIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Unified view ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      {sidebar}
      <div className="flex-1 flex flex-col items-center overflow-hidden">
        <div className="w-full max-w-2xl flex flex-col h-full px-6">
          {/* Header */}
          <div className="pt-10 pb-6 flex items-end justify-between shrink-0 relative">
            <div>
              <h1 className="text-xl font-light tracking-tight text-zinc-100">
                {activeChat?.title ?? "New chat"}
              </h1>
              {totalUsage.tokens > 0 && (
                <p className="text-[11px] text-zinc-600 mt-1">
                  {totalUsage.tokens.toLocaleString()} tokens ·{" "}
                  {formatCredits(usdToCredits(totalUsage.cost))} credits
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAllModels((s) => !s)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Models
                <span className="text-zinc-600">({models.length}/3)</span>
                <span className="text-[10px] text-zinc-700">
                  {showAllModels ? "▴" : "▾"}
                </span>
              </button>
              {messages.length > 0 && models.length > 1 && (
                <button
                  onClick={handleSplit}
                  title="Split into separate chats"
                  className="text-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer p-1"
                >
                  <SplitIcon />
                </button>
              )}
            </div>

            {showAllModels && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAllModels(false)}
                />
                <div className="absolute top-full right-0 z-20 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl w-72 max-h-96 overflow-y-auto animate-panel-in">
                  {(() => {
                    const paid = MODELS.filter((m) => isPaid(m.id));
                    const free = MODELS.filter((m) => !isPaid(m.id));
                    const renderRow = (model: (typeof MODELS)[number]) => {
                      const active = models.some((mm) => mm.id === model.id);
                      const limited = isRateLimited(model.id);
                      const atCap = models.length >= 3 && !active;
                      const paidStyle = isPaid(model.id);
                      const disabled = atCap || limited;
                      return (
                        <button
                          key={model.id}
                          onClick={() =>
                            !disabled &&
                            (active ? removeModel(model) : addModel(model))
                          }
                          disabled={disabled}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors ${
                            limited
                              ? "text-zinc-700 line-through cursor-not-allowed"
                              : active
                                ? paidStyle
                                  ? "bg-amber-950/40 text-amber-200 cursor-pointer"
                                  : "bg-zinc-800 text-zinc-200 cursor-pointer"
                                : atCap
                                  ? "text-zinc-700 cursor-not-allowed"
                                  : paidStyle
                                    ? "text-amber-600/80 hover:bg-amber-950/30 hover:text-amber-300 cursor-pointer"
                                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={model.icon}
                              alt={model.name}
                              className={`w-3.5 h-3.5 rounded-sm shrink-0 ${disabled ? "opacity-30" : ""}`}
                            />
                            {paidStyle && !limited && (
                              <span className="text-[9px] text-amber-600 shrink-0">
                                ★
                              </span>
                            )}
                            <span className="truncate">{model.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-600 shrink-0">
                            {limited
                              ? `${rateLimitMinsLeft(model.id)}m`
                              : paidStyle
                                ? `${formatCredits(usdToCredits(model.pricing.prompt))}/${formatCredits(usdToCredits(model.pricing.completion))}`
                                : "free"}
                          </span>
                        </button>
                      );
                    };
                    return (
                      <>
                        {paid.length > 0 && (
                          <>
                            <div className="text-[9px] uppercase text-amber-600/60 tracking-wider px-3 pt-1 pb-1">
                              ★ Premium
                            </div>
                            <div className="space-y-0.5">
                              {paid.map(renderRow)}
                            </div>
                          </>
                        )}
                        {free.length > 0 && (
                          <>
                            <div className="text-[9px] uppercase text-zinc-600 tracking-wider px-3 pt-3 pb-1">
                              Free
                            </div>
                            <div className="space-y-0.5">
                              {free.map(renderRow)}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto space-y-8 pb-6">
            {messages.length === 0 && (
              <p className="text-zinc-600 text-sm mt-16 select-none">
                Ask anything. All models will respond.
              </p>
            )}
            {messages.map((message, i) => {
              const meta = message.model
                ? MODELS.find((m) => m.id === message.model)
                : null;
              return (
                <div
                  key={i}
                  className={`flex flex-col animate-msg-in ${message.model ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[85%] ${message.model ? "space-y-1" : ""}`}
                  >
                    {message.model && (
                      <div className="flex items-center gap-1.5">
                        {meta && (
                          <img
                            src={meta.icon}
                            alt={meta.name}
                            className="w-3.5 h-3.5 rounded-sm"
                          />
                        )}
                        <p className="text-[11px] text-zinc-600 tracking-wide uppercase">
                          {meta?.name ?? message.model}
                        </p>
                        {message.usage && (
                          <span className="text-[10px] text-zinc-700">
                            · {formatCredits(usdToCredits(message.usage.cost))}
                          </span>
                        )}
                      </div>
                    )}
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
          {models.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 shrink-0">
              {models.map((model) => {
                const paid = isPaid(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => removeModel(model)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                      paid
                        ? "border-amber-600/60 bg-amber-950/40 text-amber-200 hover:bg-amber-950/60"
                        : "border-zinc-500 text-zinc-200 bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <img
                      src={model.icon}
                      alt={model.name}
                      className="w-3.5 h-3.5 rounded-sm"
                    />
                    {paid && (
                      <span className="text-[9px] text-amber-400">★</span>
                    )}
                    {model.name} ×
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs pb-2">{`Error: ${error}`}</p>
          )}

          {/* Input field */}
          <div className="border-t border-zinc-800 py-4 flex gap-3 shrink-0">
            <input
              type="text"
              placeholder={overLimit ? "Daily limit reached" : "Message..."}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage(userMessage);
                }
              }}
              disabled={isLoading || overLimit}
              className="flex-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none bg-transparent disabled:opacity-40"
            />
            <button
              onClick={() => handleSendMessage(userMessage)}
              disabled={isLoading || overLimit}
              title="Send"
              className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer p-1"
            >
              {isLoading ? <span className="text-sm">···</span> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
