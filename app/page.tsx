"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Chat,
  ChatMessage,
  Model,
  PromptTemplate,
} from "@/types/chat";
import {
  DAILY_LIMIT_CREDITS,
  DAILY_LIMIT_USD,
  MODELS,
  USD_PER_CREDIT,
} from "@/lib/models";
import { Markdown } from "@/components/Markdown";

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

const DownloadIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const SearchIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

const SparkleIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 4 4 5-5" />
  </svg>
);

const formatLatency = (ms: number) => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatUsd = (usd: number) => {
  if (usd === 0) return "$0";
  if (usd < 0.0001) return "<$0.0001";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
};

const ANALYSES: Record<
  string,
  { name: string; blurb: string; prompt: string }
> = {
  synthesize: {
    name: "Synthesize",
    blurb: "Merge into one best answer",
    prompt:
      "Synthesize the following AI responses into a single best answer. Note where they agree, flag important disagreements, and produce a clear final answer. Be concise.",
  },
  compare: {
    name: "Compare",
    blurb: "Agreements & disagreements",
    prompt:
      "Compare the following AI responses. List: 1) Key points all responses agree on, 2) Significant disagreements (with which model said what), 3) Unique insights from each.",
  },
  critique: {
    name: "Critique",
    blurb: "Find weaknesses",
    prompt:
      "Critique the following AI responses. For each one, identify weaknesses, potential errors, oversimplifications, or missing context. Be specific.",
  },
  factcheck: {
    name: "Fact-check",
    blurb: "Verify claims",
    prompt:
      "Fact-check the following AI responses. Identify any claims that appear factually incorrect, unverified, or suspicious. Note which model made each questionable claim. If everything looks correct, say so.",
  },
};

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
  const [view, setView] = useState<"chat" | "analytics">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
  const [analysisModelId, setAnalysisModelId] = useState<string>(
    MODELS[0].id,
  );
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Scroll refs for keeping convos pinned to bottom across split/merge
  const unifiedScrollRef = useRef<HTMLDivElement | null>(null);
  const slotScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      const storedTemplates = localStorage.getItem("templates");
      if (storedTemplates) setTemplates(JSON.parse(storedTemplates));
      const storedAnalysisModel = localStorage.getItem("analysisModelId");
      if (
        storedAnalysisModel &&
        MODELS.some((m) => m.id === storedAnalysisModel)
      ) {
        setAnalysisModelId(storedAnalysisModel);
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
    localStorage.setItem("templates", JSON.stringify(templates));
  }, [templates, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("analysisModelId", analysisModelId);
  }, [analysisModelId, hydrated]);

  // Pin to bottom on message changes / view transitions
  useEffect(() => {
    if (isSplit) return;
    const el = unifiedScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isLoading, isSplit, activeChatId]);

  useEffect(() => {
    if (!isSplit) return;
    slots.forEach((_, i) => {
      const el = slotScrollRefs.current[i];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [isSplit, slots]);

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
    setView("chat");
    setActiveChatId(null);
    setIsSplit(false);
    setSlots([]);
  };

  const switchChat = (id: string) => {
    setView("chat");
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

  // ─── Analytics ────────────────────────────────────────────────────────────
  const analytics = (() => {
    const stats: Record<
      string,
      {
        responses: number;
        errors: number;
        latencySum: number;
        costSum: number;
        promptTokensSum: number;
        completionTokensSum: number;
      }
    > = {};

    chats.forEach((chat) => {
      chat.messages.forEach((m) => {
        if (m.role !== "assistant" || !m.model) return;
        if (!stats[m.model]) {
          stats[m.model] = {
            responses: 0,
            errors: 0,
            latencySum: 0,
            costSum: 0,
            promptTokensSum: 0,
            completionTokensSum: 0,
          };
        }
        const s = stats[m.model];
        const isError = m.content.startsWith("⚠");
        s.responses += 1;
        if (isError) s.errors += 1;
        if (m.usage) {
          s.latencySum += m.usage.latencyMs ?? 0;
          s.costSum += m.usage.cost;
          s.promptTokensSum += m.usage.promptTokens;
          s.completionTokensSum += m.usage.completionTokens;
        }
      });
    });

    return Object.entries(stats)
      .map(([id, s]) => {
        const meta = MODELS.find((m) => m.id === id);
        const ok = s.responses - s.errors;
        return {
          id,
          name: meta?.name ?? id,
          icon: meta?.icon,
          paid: meta ? isPaid(meta.id) : false,
          responses: s.responses,
          errors: s.errors,
          successRate: s.responses > 0 ? ((s.responses - s.errors) / s.responses) * 100 : 0,
          avgLatencyMs: ok > 0 ? s.latencySum / ok : 0,
          avgCost: ok > 0 ? s.costSum / ok : 0,
          avgTokens:
            ok > 0 ? (s.promptTokensSum + s.completionTokensSum) / ok : 0,
          totalCost: s.costSum,
          totalTokens: s.promptTokensSum + s.completionTokensSum,
        };
      })
      .sort((a, b) => b.responses - a.responses);
  })();

  const analyticsTotals = analytics.reduce(
    (acc, s) => ({
      responses: acc.responses + s.responses,
      errors: acc.errors + s.errors,
      cost: acc.cost + s.totalCost,
      tokens: acc.tokens + s.totalTokens,
    }),
    { responses: 0, errors: 0, cost: 0, tokens: 0 },
  );

  // Find best/worst per metric for highlighting
  const bestSpeed = [...analytics].sort(
    (a, b) => a.avgLatencyMs - b.avgLatencyMs,
  )[0]?.id;
  const cheapest = [...analytics].sort((a, b) => a.avgCost - b.avgCost)[0]?.id;
  const mostUsed = analytics[0]?.id;

  // ─── Filters/derived ──────────────────────────────────────────────────────
  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
    : chats;

  // Find the latest user query and the assistant responses (excluding past syntheses)
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  })();
  const latestResponses =
    lastUserIdx === -1
      ? []
      : messages
          .slice(lastUserIdx + 1)
          .filter((m) => m.role === "assistant" && !m.synthesis);

  // ─── Templates ────────────────────────────────────────────────────────────
  const saveTemplate = () => {
    if (!systemPrompt.trim()) return;
    const name =
      prompt("Template name?", systemPrompt.slice(0, 30))?.trim() || null;
    if (!name) return;
    setTemplates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, prompt: systemPrompt },
    ]);
  };

  const loadTemplate = (t: PromptTemplate) => {
    setSystemPrompt(t.prompt);
    setShowTemplates(false);
    setShowSystemPrompt(true);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const exportChat = (chat: Chat) => {
    const lines: string[] = [`# ${chat.title}`, ""];
    chat.messages.forEach((m) => {
      if (m.role === "user") {
        lines.push("**User**", "", m.content, "");
      } else {
        const meta = MODELS.find((mm) => mm.id === m.model);
        const label = m.synthesis
          ? `★ Synthesis (${meta?.name ?? m.model ?? "?"})`
          : (meta?.name ?? m.model ?? "Assistant");
        lines.push(`**${label}**`, "", m.content, "");
      }
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Analysis (synthesize, compare, critique, factcheck, custom) ─────────
  const canAnalyze =
    latestResponses.length >= 1 && !isAnalyzing && !isLoading && !overLimit;

  const handleAnalysis = async (
    preset: keyof typeof ANALYSES | "custom",
    customText?: string,
  ) => {
    if (!canAnalyze || !activeChatId || lastUserIdx === -1) return;

    const analysisModel =
      MODELS.find((m) => m.id === analysisModelId) ?? MODELS[0];
    if (isRateLimited(analysisModel.id)) {
      setError(`${analysisModel.name} is rate limited. Pick another.`);
      return;
    }

    const userQ = messages[lastUserIdx];
    const instruction =
      preset === "custom"
        ? (customText ?? "").trim()
        : ANALYSES[preset].prompt;
    if (!instruction) return;

    const fullPrompt = `${instruction}

QUESTION: ${userQ.content}

${latestResponses
  .map((r) => {
    const m = MODELS.find((x) => x.id === r.model);
    return `=== ${m?.name ?? r.model} ===\n${r.content}`;
  })
  .join("\n\n")}`;

    setIsAnalyzing(true);
    setError(null);
    try {
      const start = Date.now();
      const result = await fetchCompletion(
        [{ role: "user", content: fullPrompt }],
        analysisModel.id,
        null,
      );
      const latencyMs = Date.now() - start;
      const cost = computeCost(
        analysisModel.id,
        result.usage.promptTokens,
        result.usage.completionTokens,
      );
      appendToChat(activeChatId, {
        role: "assistant",
        content: result.completion,
        model: analysisModel.id,
        synthesis: true,
        usage: { ...result.usage, cost, latencyMs },
      });
      setDailySpend((p) => p + cost);
      if (preset === "custom") setAnalysisPrompt("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "RATE_LIMIT") markRateLimited(analysisModel.id);
      const presetName =
        preset === "custom" ? "Analysis" : ANALYSES[preset].name;
      appendToChat(activeChatId, {
        role: "assistant",
        content:
          msg === "RATE_LIMIT"
            ? `⚠ ${presetName} failed: rate limited.`
            : `⚠ ${presetName} failed: ${msg}`,
        model: analysisModel.id,
        synthesis: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
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
          const start = Date.now();
          const result = await fetchCompletion(
            modelMessages,
            model.id,
            systemPrompt || null,
          );
          const latencyMs = Date.now() - start;
          const cost = computeCost(
            model.id,
            result.usage.promptTokens,
            result.usage.completionTokens,
          );
          appendToChat(chatId, {
            role: "assistant",
            content: result.completion,
            model: model.id,
            usage: { ...result.usage, cost, latencyMs },
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
      const start = Date.now();
      const result = await fetchCompletion(
        fullHistory,
        slot.modelId,
        systemPrompt || null,
      );
      const latencyMs = Date.now() - start;
      const cost = computeCost(
        slot.modelId,
        result.usage.promptTokens,
        result.usage.completionTokens,
      );
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.completion,
        model: slot.modelId,
        usage: { ...result.usage, cost, latencyMs },
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
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors text-zinc-400 cursor-pointer"
        >
          <PlusIcon />
          New chat
        </button>
        <button
          onClick={() => setView("analytics")}
          className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
            view === "analytics"
              ? "border-zinc-600 text-zinc-200 bg-zinc-900"
              : "border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 text-zinc-400"
          }`}
        >
          <ChartIcon />
          Analytics
        </button>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChats.length === 0 && (
          <p className="text-xs text-zinc-700 text-center mt-4">
            {searchQuery ? "No matches" : "No chats yet"}
          </p>
        )}
        {filteredChats.map((chat) => (
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
            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportChat(chat);
                }}
                title="Export as markdown"
                className="text-zinc-700 hover:text-zinc-300 cursor-pointer"
              >
                <DownloadIcon />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                title="Delete"
                className="text-zinc-700 hover:text-red-400 cursor-pointer"
              >
                <TrashIcon />
              </button>
            </div>
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
            <>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                rows={4}
                className="mt-2 w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveTemplate}
                  disabled={!systemPrompt.trim()}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Save as template
                </button>
                {templates.length > 0 && (
                  <button
                    onClick={() => setShowTemplates((s) => !s)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer ml-auto"
                  >
                    Templates ({templates.length})
                  </button>
                )}
              </div>
              {showTemplates && templates.length > 0 && (
                <div className="mt-2 space-y-1 border border-zinc-800 rounded-lg p-1 bg-zinc-900">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                    >
                      <button
                        onClick={() => loadTemplate(t)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 truncate flex-1 text-left cursor-pointer"
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        title="Delete template"
                        className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
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
                  {meta &&
                    (() => {
                      const panelUsage = [
                        ...slot.preSplitMessages,
                        ...slot.postSplitMessages,
                      ].reduce(
                        (acc, m) => {
                          if (m.usage) {
                            acc.tokens +=
                              m.usage.promptTokens + m.usage.completionTokens;
                            acc.cost += m.usage.cost;
                          }
                          return acc;
                        },
                        { tokens: 0, cost: 0 },
                      );
                      return (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[10px]">
                            <span
                              className={
                                isPaid(meta.id)
                                  ? "text-amber-600/70"
                                  : "text-zinc-600"
                              }
                            >
                              {isPaid(meta.id) ? "★ Premium · " : "Free · "}
                            </span>
                            <span className="text-zinc-600">
                              ${meta.pricing.prompt.toFixed(2)} in · $
                              {meta.pricing.completion.toFixed(2)} out / 1M
                            </span>
                          </p>
                          {panelUsage.tokens > 0 && (
                            <p className="text-[10px] text-zinc-700">
                              {panelUsage.tokens.toLocaleString()} tokens ·{" "}
                              {formatUsd(panelUsage.cost)}
                            </p>
                          )}
                        </div>
                      );
                    })()}

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
                                : `$${m.pricing.prompt}/$${m.pricing.completion}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div
                  ref={(el) => {
                    slotScrollRefs.current[slotIndex] = el;
                  }}
                  className="flex-1 overflow-y-auto px-4 py-5 space-y-5"
                >
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
                        {message.role === "user" ? (
                          <p className="text-sm leading-relaxed max-w-[90%] bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          <div className="max-w-[90%]">
                            <Markdown content={message.content} />
                          </div>
                        )}
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
                        {message.role === "user" ? (
                          <p className="text-sm leading-relaxed max-w-[90%] bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          <div className="max-w-[90%]">
                            <Markdown content={message.content} />
                          </div>
                        )}
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
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                  >
                    <MergeIcon />
                    Merge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Analytics view ───────────────────────────────────────────────────────
  if (view === "analytics") {
    return (
      <div className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
        {sidebar}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-10 animate-msg-in">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h1 className="text-xl font-light tracking-tight text-zinc-100">
                  Analytics
                </h1>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Across {chats.length} chat{chats.length === 1 ? "" : "s"} ·{" "}
                  {analyticsTotals.responses} responses ·{" "}
                  {analyticsTotals.tokens.toLocaleString()} tokens ·{" "}
                  {formatUsd(analyticsTotals.cost)}
                </p>
              </div>
            </div>

            {analytics.length === 0 ? (
              <p className="text-zinc-600 text-sm">
                No data yet. Send some messages to see model stats.
              </p>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="border border-zinc-800 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Fastest
                    </p>
                    <p className="text-sm text-zinc-200 mt-1 truncate">
                      {analytics.find((s) => s.id === bestSpeed)?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {bestSpeed
                        ? formatLatency(
                            analytics.find((s) => s.id === bestSpeed)
                              ?.avgLatencyMs ?? 0,
                          )
                        : ""}
                    </p>
                  </div>
                  <div className="border border-zinc-800 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Cheapest avg
                    </p>
                    <p className="text-sm text-zinc-200 mt-1 truncate">
                      {analytics.find((s) => s.id === cheapest)?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {cheapest
                        ? `${formatUsd(analytics.find((s) => s.id === cheapest)?.avgCost ?? 0)} / msg`
                        : ""}
                    </p>
                  </div>
                  <div className="border border-zinc-800 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Most used
                    </p>
                    <p className="text-sm text-zinc-200 mt-1 truncate">
                      {analytics.find((s) => s.id === mostUsed)?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {mostUsed
                        ? `${analytics.find((s) => s.id === mostUsed)?.responses} responses`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Per-model table */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-zinc-600 bg-zinc-900/50">
                        <th className="text-left px-4 py-2.5 font-medium">
                          Model
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Responses
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Avg latency
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Avg tokens
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Avg cost
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Total cost
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium">
                          Success
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((s, i) => {
                        const successColor =
                          s.successRate >= 95
                            ? "text-zinc-400"
                            : s.successRate >= 80
                              ? "text-yellow-500"
                              : "text-red-400";
                        return (
                          <tr
                            key={s.id}
                            className={`border-t border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/30"}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {s.icon && (
                                  <img
                                    src={s.icon}
                                    alt={s.name}
                                    className="w-4 h-4 rounded-sm shrink-0"
                                  />
                                )}
                                {s.paid && (
                                  <span className="text-amber-500 text-[10px]">
                                    ★
                                  </span>
                                )}
                                <span
                                  className={
                                    s.paid ? "text-amber-200" : "text-zinc-200"
                                  }
                                >
                                  {s.name}
                                </span>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                              {s.responses}
                            </td>
                            <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                              {s.avgLatencyMs > 0
                                ? formatLatency(s.avgLatencyMs)
                                : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                              {s.avgTokens > 0
                                ? Math.round(s.avgTokens).toLocaleString()
                                : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                              {s.avgCost > 0 ? formatUsd(s.avgCost) : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-zinc-300 tabular-nums">
                              {s.totalCost > 0 ? formatUsd(s.totalCost) : "—"}
                            </td>
                            <td
                              className={`text-right px-4 py-3 tabular-nums ${successColor}`}
                            >
                              {Math.round(s.successRate)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-zinc-700 mt-4">
                  Latency includes network roundtrip. Daily budget shown in
                  credits (1 credit = $0.0001).
                </p>
              </>
            )}
          </div>
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
                  {formatUsd(totalUsage.cost)}
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
              {!showAnalysisPanel && (
                <button
                  onClick={() => setShowAnalysisPanel(true)}
                  title="Open analysis panel"
                  className="flex items-center gap-1.5 text-xs text-amber-600/80 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <SparkleIcon />
                  Analysis
                </button>
              )}
              {messages.length > 0 && models.length > 1 && (
                <button
                  onClick={handleSplit}
                  title="Split into separate chats"
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <SplitIcon />
                  Split
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
                                ? `$${model.pricing.prompt}/$${model.pricing.completion}`
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
          <div
            ref={unifiedScrollRef}
            className="flex-1 overflow-y-auto space-y-8 pb-6"
          >
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
                        {message.synthesis ? (
                          <span className="text-amber-400">
                            <SparkleIcon />
                          </span>
                        ) : (
                          meta && (
                            <img
                              src={meta.icon}
                              alt={meta.name}
                              className="w-3.5 h-3.5 rounded-sm"
                            />
                          )
                        )}
                        <p
                          className={`text-[11px] tracking-wide uppercase ${
                            message.synthesis
                              ? "text-amber-400/90 font-medium"
                              : "text-zinc-600"
                          }`}
                        >
                          {message.synthesis
                            ? `Synthesis · ${meta?.name ?? message.model}`
                            : (meta?.name ?? message.model)}
                        </p>
                        {message.usage && (
                          <span className="text-[10px] text-zinc-700">
                            · {formatUsd(message.usage.cost)}
                            {message.usage.latencyMs !== undefined && (
                              <> · {formatLatency(message.usage.latencyMs)}</>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    {message.model ? (
                      <div
                        className={
                          message.synthesis
                            ? "border-l-2 border-amber-600/40 pl-3 bg-amber-950/10 rounded-r-md py-1"
                            : ""
                        }
                      >
                        <Markdown content={message.content} />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
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
      {showAnalysisPanel && (
        <aside className="w-72 border-l border-zinc-800 flex flex-col shrink-0 bg-zinc-950 animate-panel-in">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">
                <SparkleIcon />
              </span>
              <h2 className="text-xs uppercase tracking-wider text-zinc-300">
                Analysis
              </h2>
            </div>
            <button
              onClick={() => setShowAnalysisPanel(false)}
              title="Hide panel"
              className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer text-base leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Status / context */}
            <div className="text-[10px] text-zinc-600 leading-relaxed">
              {latestResponses.length === 0
                ? "No responses to analyze yet. Send a message first."
                : `Analyzing ${latestResponses.length} response${latestResponses.length === 1 ? "" : "s"} to your latest message.`}
            </div>

            {/* Model picker */}
            <div>
              <p className="text-[10px] uppercase text-zinc-600 tracking-wider mb-2">
                Model
              </p>
              <select
                value={analysisModelId}
                onChange={(e) => setAnalysisModelId(e.target.value)}
                disabled={isAnalyzing}
                className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
              >
                <optgroup label="★ Premium">
                  {MODELS.filter((m) => isPaid(m.id)).map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={isRateLimited(m.id)}
                    >
                      {m.name}
                      {isRateLimited(m.id) ? " (rate limited)" : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Free">
                  {MODELS.filter((m) => !isPaid(m.id)).map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={isRateLimited(m.id)}
                    >
                      {m.name}
                      {isRateLimited(m.id) ? " (rate limited)" : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
              {(() => {
                const m = MODELS.find((x) => x.id === analysisModelId);
                if (!m) return null;
                return (
                  <p className="text-[10px] text-zinc-600 mt-1.5">
                    ${m.pricing.prompt.toFixed(2)} in · $
                    {m.pricing.completion.toFixed(2)} out / 1M
                  </p>
                );
              })()}
            </div>

            {/* Preset analyses */}
            <div>
              <p className="text-[10px] uppercase text-zinc-600 tracking-wider mb-2">
                Run analysis
              </p>
              <div className="space-y-1.5">
                {Object.entries(ANALYSES).map(([key, a]) => (
                  <button
                    key={key}
                    onClick={() =>
                      handleAnalysis(key as keyof typeof ANALYSES)
                    }
                    disabled={!canAnalyze}
                    className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800 hover:border-amber-700/60 hover:bg-amber-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-200 group-hover:text-amber-200">
                        {a.name}
                      </span>
                      {key === "synthesize" && (
                        <span className="text-[9px] text-amber-600">★</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {a.blurb}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div>
              <p className="text-[10px] uppercase text-zinc-600 tracking-wider mb-2">
                Custom
              </p>
              <textarea
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                placeholder="Ask anything about the responses..."
                rows={3}
                disabled={isAnalyzing}
                className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => handleAnalysis("custom", analysisPrompt)}
                disabled={!canAnalyze || !analysisPrompt.trim()}
                className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 hover:border-amber-700/60 hover:bg-amber-950/20 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-zinc-300"
              >
                {isAnalyzing ? "Running..." : "Run custom analysis"}
              </button>
            </div>

            {isAnalyzing && (
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 bg-amber-700 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
                <span className="text-[10px] text-zinc-600 ml-1">
                  Analyzing...
                </span>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
