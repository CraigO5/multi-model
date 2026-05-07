"use client";

import { useEffect, useRef, useState } from "react";
import type { Chat, ChatMessage, Model, PromptTemplate, Slot } from "@/types/chat";
import { MODELS, MAX_HISTORY_MESSAGES, MAX_INPUT_CHARS } from "@/lib/models";
import {
  ANALYSES,
  computeCost,
  formatUsd,
  isPaid,
  shuffleArray,
  todayKey,
} from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AnalyticsView } from "@/components/AnalyticsView";
import { SplitView } from "@/components/SplitView";
import { ChatView } from "@/components/ChatView";
import { SplitIcon } from "@/components/icons";

export default function Home() {
  // ─── Core state ──────────────────────────────────────────────────────────
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
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [chartMetric, setChartMetric] = useState<"tokens" | "cost" | "latency">("tokens");
  const [analysisModelId, setAnalysisModelId] = useState<string>(MODELS[0].id);
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [temperature, setTemperature] = useState(1.0);
  const [blindMode, setBlindMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Streaming content: modelId → partial content during streaming
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});

  // Scroll refs
  const unifiedScrollRef = useRef<HTMLDivElement | null>(null);
  const slotScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Abort controllers for in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const slotAbortRefs = useRef<(AbortController | null)[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tick, setTick] = useState(0);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages: ChatMessage[] = activeChat?.messages ?? [];
  const overLimit = dailySpend >= 0.25; // DAILY_LIMIT_USD

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

  const isRateLimited = (modelId: string) => {
    const reset = rateLimited[modelId];
    return reset !== undefined && reset > Date.now();
  };

  const rateLimitMinsLeft = (modelId: string) => {
    const reset = rateLimited[modelId];
    if (!reset) return 0;
    return Math.max(0, Math.ceil((reset - Date.now()) / 60_000));
  };

  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
    : chats;

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

  const canAnalyze =
    latestResponses.length >= 1 && !isAnalyzing && !isLoading && !overLimit;

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
          successRate:
            s.responses > 0
              ? ((s.responses - s.errors) / s.responses) * 100
              : 0,
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

  const bestSpeed = [...analytics].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0]?.id;
  const cheapest = [...analytics].sort((a, b) => a.avgCost - b.avgCost)[0]?.id;
  const mostUsed = analytics[0]?.id;

  const chartSeries = (() => {
    const series: Record<string, number[]> = {};
    chats.forEach((chat) => {
      chat.messages.forEach((m) => {
        if (m.role !== "assistant" || !m.model || !m.usage) return;
        if (m.content.startsWith("⚠")) return;
        if (!series[m.model]) series[m.model] = [];
        let val = 0;
        if (chartMetric === "tokens") {
          val = m.usage.promptTokens + m.usage.completionTokens;
        } else if (chartMetric === "cost") {
          val = m.usage.cost;
        } else if (chartMetric === "latency") {
          val = m.usage.latencyMs ?? 0;
        }
        series[m.model].push(val);
      });
    });
    return series;
  })();

  const chartMaxIdx = Math.max(1, ...Object.values(chartSeries).map((s) => s.length));
  const chartMaxVal = Math.max(1, ...Object.values(chartSeries).flat());

  // ─── localStorage hydration ───────────────────────────────────────────────
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
      if (storedAnalysisModel && MODELS.some((m) => m.id === storedAnalysisModel)) {
        setAnalysisModelId(storedAnalysisModel);
      }
      const storedActiveModels = localStorage.getItem("activeModels");
      if (storedActiveModels) {
        const ids: string[] = JSON.parse(storedActiveModels);
        const restored = ids
          .map((id) => MODELS.find((m) => m.id === id))
          .filter((m): m is (typeof MODELS)[number] => Boolean(m));
        if (restored.length > 0) setModels(restored);
      }
      const storedTemp = localStorage.getItem("temperature");
      if (storedTemp) {
        const parsed = parseFloat(storedTemp);
        if (!Number.isNaN(parsed)) setTemperature(parsed);
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    setHydrated(true);

    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ─── localStorage persistence ─────────────────────────────────────────────
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

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("activeModels", JSON.stringify(models.map((m) => m.id)));
  }, [models, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("temperature", String(temperature));
  }, [temperature, hydrated]);

  // ─── Scroll pinning ───────────────────────────────────────────────────────
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

  // ─── Chat helpers ─────────────────────────────────────────────────────────
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

  const editTitle = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChats((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c,
      ),
    );
  };

  const addModel = (model: Model) => {
    if (models.length >= 3) return;
    setModels((prev) => [...prev, model]);
  };

  const removeModel = (model: Model) => {
    setModels((prev) => prev.filter((m) => m.id !== model.id));
  };

  // ─── Streaming API call ───────────────────────────────────────────────────
  const fetchCompletionStream = async (
    msgs: ChatMessage[],
    modelId: string,
    prompt: string | null,
    signal: AbortSignal | undefined,
    onChunk: (delta: string) => void,
  ): Promise<{ usage: { promptTokens: number; completionTokens: number } }> => {
    const response = await fetch("/api/openrouter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, model: modelId, prompt, temperature }),
      signal,
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      throw new Error(`HTTP ${response.status}`);
    }
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage = { promptTokens: 0, completionTokens: 0 };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string") onChunk(delta);
          if (json.usage) {
            usage = {
              promptTokens: json.usage.prompt_tokens ?? 0,
              completionTokens: json.usage.completion_tokens ?? 0,
            };
          }
        } catch { /* ignore parse errors */ }
      }
    }
    return { usage };
  };

  // Legacy non-streaming fetch (used for analysis and split view)
  const fetchCompletion = async (
    nextMessages: ChatMessage[],
    model: string,
    prompt: string | null,
    signal?: AbortSignal,
  ) => {
    let fullContent = "";
    const result = await fetchCompletionStream(
      nextMessages,
      model,
      prompt,
      signal,
      (delta) => { fullContent += delta; },
    );
    return {
      completion: fullContent,
      usage: result.usage,
    };
  };

  const markRateLimited = (modelId: string) => {
    const resetIn = isPaid(modelId) ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
    setRateLimited((prev) => ({ ...prev, [modelId]: Date.now() + resetIn }));
    setModels((prev) => prev.filter((m) => m.id !== modelId));
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setStreamingContent({});
  };

  const handleSlotCancel = (slotIndex: number) => {
    slotAbortRefs.current[slotIndex]?.abort();
    slotAbortRefs.current[slotIndex] = null;
    setSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, isLoading: false } : s)),
    );
  };

  // ─── Templates ───────────────────────────────────────────────────────────
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

  // ─── Analysis ────────────────────────────────────────────────────────────
  const handleAnalysis = async (
    preset: keyof typeof ANALYSES | "custom",
    customText?: string,
  ) => {
    if (!canAnalyze || !activeChatId || lastUserIdx === -1) return;

    const analysisModel = MODELS.find((m) => m.id === analysisModelId) ?? MODELS[0];
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

${systemPrompt ? `SYSTEM PROMPT: ${systemPrompt}\n\n` : ""}QUESTION: ${userQ.content}

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

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || overLimit) return;
    if (content.length > MAX_INPUT_CHARS) return;

    setUserMessage("");
    setError(null);

    const chatId = ensureChat(content);
    const userMsg: ChatMessage = { role: "user", content };
    appendToChat(chatId, userMsg);

    const baseMessages = chats.find((c) => c.id === chatId)?.messages ?? [];
    const nextMessages = [...baseMessages, userMsg];

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    if (blindMode) {
      // Blind mode: run all in parallel, collect, shuffle, append all at once
      // so arrival order can't reveal identity
      const blindResults = await Promise.allSettled(
        models.map(async (model) => {
          const modelMessages = nextMessages
            .filter((m) => m.role === "user" || m.model === model.id)
            .slice(-MAX_HISTORY_MESSAGES);
          const start = Date.now();
          let accumulated = "";
          const result = await fetchCompletionStream(
            modelMessages,
            model.id,
            systemPrompt || null,
            controller.signal,
            (delta) => { accumulated += delta; },
          );
          const latencyMs = Date.now() - start;
          const cost = computeCost(
            model.id,
            result.usage.promptTokens,
            result.usage.completionTokens,
          );
          const msg: ChatMessage = {
            role: "assistant",
            content: accumulated,
            model: model.id,
            usage: { ...result.usage, cost, latencyMs },
          };
          return { msg, cost };
        }),
      );

      const settled: { msg: ChatMessage; cost: number }[] = [];
      blindResults.forEach((r, idx) => {
        const model = models[idx];
        if (r.status === "fulfilled") {
          settled.push(r.value);
        } else {
          if (r.reason instanceof Error && r.reason.name === "AbortError") return;
          const errMsg = r.reason instanceof Error ? r.reason.message : "Unknown error";
          if (errMsg === "RATE_LIMIT") markRateLimited(model.id);
          settled.push({
            msg: {
              role: "assistant",
              model: model.id,
              content:
                errMsg === "RATE_LIMIT"
                  ? isPaid(model.id) ? "⚠ rate_limit_paid" : "⚠ rate_limit_free"
                  : `⚠ ${errMsg}`,
            },
            cost: 0,
          });
        }
      });

      // Shuffle so display order is random — can't guess by position
      const shuffled = shuffleArray(settled);
      let totalCost = 0;
      shuffled.forEach(({ msg, cost }) => {
        appendToChat(chatId, msg);
        totalCost += cost;
      });
      if (totalCost > 0) setDailySpend((prev) => prev + totalCost);
    } else {
      // Normal mode: stream results in as they arrive
      await Promise.allSettled(
        models.map(async (model) => {
          try {
            const modelMessages = nextMessages
              .filter((m) => m.role === "user" || m.model === model.id)
              .slice(-MAX_HISTORY_MESSAGES);
            const start = Date.now();
            let accumulated = "";
            const result = await fetchCompletionStream(
              modelMessages,
              model.id,
              systemPrompt || null,
              controller.signal,
              (delta) => {
                accumulated += delta;
                setStreamingContent((prev) => ({
                  ...prev,
                  [model.id]: (prev[model.id] ?? "") + delta,
                }));
              },
            );
            const latencyMs = Date.now() - start;
            const cost = computeCost(
              model.id,
              result.usage.promptTokens,
              result.usage.completionTokens,
            );
            // Clear streaming content for this model and append final message
            setStreamingContent((prev) => {
              const next = { ...prev };
              delete next[model.id];
              return next;
            });
            appendToChat(chatId, {
              role: "assistant",
              content: accumulated,
              model: model.id,
              usage: { ...result.usage, cost, latencyMs },
            });
            setDailySpend((prev) => prev + cost);
          } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
              setStreamingContent((prev) => {
                const next = { ...prev };
                delete next[model.id];
                return next;
              });
              return;
            }
            const msg = e instanceof Error ? e.message : "Unknown error";
            setStreamingContent((prev) => {
              const next = { ...prev };
              delete next[model.id];
              return next;
            });
            if (msg === "RATE_LIMIT") {
              markRateLimited(model.id);
              appendToChat(chatId, {
                role: "assistant",
                model: model.id,
                content: isPaid(model.id) ? "⚠ rate_limit_paid" : "⚠ rate_limit_free",
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
    }

    abortControllerRef.current = null;
    setIsLoading(false);
  };

  // ─── Regenerate ───────────────────────────────────────────────────────────
  const handleRegenerate = async (modelId: string, userMsgIdx: number) => {
    if (!activeChatId) return;

    // Build message history up to and including the user message at userMsgIdx,
    // filtered to this model's history
    const allMsgs = activeChat?.messages ?? [];
    const historyUpTo = allMsgs.slice(0, userMsgIdx + 1);
    const modelMessages = historyUpTo
      .filter((m) => m.role === "user" || m.model === modelId)
      .slice(-MAX_HISTORY_MESSAGES);

    const start = Date.now();
    let accumulated = "";

    try {
      setStreamingContent((prev) => ({ ...prev, [modelId]: "" }));
      const result = await fetchCompletionStream(
        modelMessages,
        modelId,
        systemPrompt || null,
        undefined,
        (delta) => {
          accumulated += delta;
          setStreamingContent((prev) => ({
            ...prev,
            [modelId]: (prev[modelId] ?? "") + delta,
          }));
        },
      );
      const latencyMs = Date.now() - start;
      const cost = computeCost(modelId, result.usage.promptTokens, result.usage.completionTokens);

      // Find the existing assistant message for this model after userMsgIdx and replace it
      setStreamingContent((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== activeChatId) return c;
          // Find the assistant message index for this model after userMsgIdx
          const msgs = [...c.messages];
          let targetIdx = -1;
          for (let i = userMsgIdx + 1; i < msgs.length; i++) {
            if (msgs[i].role === "assistant" && msgs[i].model === modelId && !msgs[i].synthesis) {
              targetIdx = i;
              break;
            }
          }
          if (targetIdx === -1) {
            // Append if not found
            return {
              ...c,
              messages: [
                ...msgs,
                {
                  role: "assistant" as const,
                  content: accumulated,
                  model: modelId,
                  usage: { ...result.usage, cost, latencyMs },
                },
              ],
              updatedAt: Date.now(),
            };
          }
          msgs[targetIdx] = {
            role: "assistant",
            content: accumulated,
            model: modelId,
            usage: { ...result.usage, cost, latencyMs },
          };
          return { ...c, messages: msgs, updatedAt: Date.now() };
        }),
      );
    } catch (e) {
      setStreamingContent((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "RATE_LIMIT") markRateLimited(modelId);
    }
  };

  // ─── Split / merge ────────────────────────────────────────────────────────
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
    ].slice(-MAX_HISTORY_MESSAGES);

    const controller = new AbortController();
    slotAbortRefs.current[slotIndex] = controller;

    try {
      const start = Date.now();
      const result = await fetchCompletion(
        fullHistory,
        slot.modelId,
        systemPrompt || null,
        controller.signal,
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
      if (e instanceof Error && e.name === "AbortError") {
        setSlots((prev) =>
          prev.map((s, i) => (i === slotIndex ? { ...s, isLoading: false } : s)),
        );
        return;
      }
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "RATE_LIMIT") markRateLimited(slot.modelId);
      const errMsg: ChatMessage = {
        role: "assistant",
        model: slot.modelId,
        content:
          msg === "RATE_LIMIT"
            ? isPaid(slot.modelId) ? "⚠ rate_limit_paid" : "⚠ rate_limit_free"
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
    } finally {
      slotAbortRefs.current[slotIndex] = null;
    }
  };

  const handleSetView = (v: "chat" | "analytics") => {
    setView(v);
    if (v === "analytics") { setIsSplit(false); setSlots([]); }
  };

  // ─── Shared sidebar props ─────────────────────────────────────────────────
  const sidebarProps = {
    filteredChats,
    activeChatId,
    searchQuery,
    setSearchQuery,
    newChat,
    switchChat,
    deleteChat,
    editTitle,
    exportChat,
    overLimit,
    dailySpend,
    isOpen: sidebarOpen,
    onClose: () => setSidebarOpen(false),
  };

  const studioProps = {
    latestResponses,
    canAnalyze,
    analysisModelId,
    setAnalysisModelId,
    analysisPrompt,
    setAnalysisPrompt,
    isAnalyzing,
    isRateLimited,
    setShowAnalysisPanel,
    handleAnalysis,
    view,
    setView: handleSetView,
    temperature,
    setTemperature,
    systemPrompt,
    setSystemPrompt,
    showTemplates,
    setShowTemplates,
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
  };

  // ─── Unified layout ───────────────────────────────────────────────────────
  return (
    <div
      className="flex overflow-hidden"
      style={{
        background: "var(--cz-bg)",
        color: "var(--cz-text)",
        height: "100dvh",
        maxHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      onClick={() => isSplit && setSwapSlot(null)}
    >
      <Sidebar {...sidebarProps} />

      {/* Main content */}
      {isSplit ? (
        <>
          {/* Desktop: full split view */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            <SplitView
              slots={slots}
              setSlots={setSlots}
              swapSlot={swapSlot}
              setSwapSlot={setSwapSlot}
              hoveredSlot={hoveredSlot}
              setHoveredSlot={setHoveredSlot}
              mergingFrom={mergingFrom}
              slotScrollRefs={slotScrollRefs}
              overLimit={overLimit}
              isRateLimited={isRateLimited}
              rateLimitMinsLeft={rateLimitMinsLeft}
              handleMerge={handleMerge}
              handleSwapModel={handleSwapModel}
              handleSplitSend={handleSplitSend}
              handleSlotCancel={handleSlotCancel}
            />
          </div>
          {/* Mobile: show normal chat with exit-split banner */}
          <div className="flex md:hidden flex-1 flex-col overflow-hidden">
            <button
              onClick={() => { setIsSplit(false); setSlots([]); }}
              className="shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--cz-accent-soft)",
                color: "var(--cz-accent)",
                border: 0,
                borderBottom: "1px solid rgba(237,230,221,0.06)",
              }}
            >
              <SplitIcon size={14} />
              Split view is desktop only — tap to go back
            </button>
            <ChatView
              activeChat={activeChat}
              messages={messages}
              isLoading={isLoading}
              models={models}
              addModel={addModel}
              removeModel={removeModel}
              showAllModels={showAllModels}
              setShowAllModels={setShowAllModels}
              isRateLimited={isRateLimited}
              rateLimitMinsLeft={rateLimitMinsLeft}
              totalUsage={totalUsage}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              handleSendMessage={handleSendMessage}
              handleCancel={handleCancel}
              showAnalysisPanel={showAnalysisPanel}
              setShowAnalysisPanel={setShowAnalysisPanel}
              unifiedScrollRef={unifiedScrollRef}
              error={error}
              overLimit={overLimit}
              blindMode={blindMode}
              setBlindMode={setBlindMode}
              streamingContent={streamingContent}
              handleRegenerate={handleRegenerate}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          </div>
        </>
      ) : view === "analytics" ? (
        <AnalyticsView
          chats={chats}
          analytics={analytics}
          analyticsTotals={analyticsTotals}
          bestSpeed={bestSpeed}
          cheapest={cheapest}
          mostUsed={mostUsed}
          chartSeries={chartSeries}
          chartMaxIdx={chartMaxIdx}
          chartMaxVal={chartMaxVal}
          chartMetric={chartMetric}
          setChartMetric={setChartMetric}
        />
      ) : (
        <ChatView
          activeChat={activeChat}
          messages={messages}
          isLoading={isLoading}
          models={models}
          addModel={addModel}
          removeModel={removeModel}
          showAllModels={showAllModels}
          setShowAllModels={setShowAllModels}
          isRateLimited={isRateLimited}
          rateLimitMinsLeft={rateLimitMinsLeft}
          totalUsage={totalUsage}
          userMessage={userMessage}
          setUserMessage={setUserMessage}
          handleSendMessage={handleSendMessage}
          handleCancel={handleCancel}
          showAnalysisPanel={showAnalysisPanel}
          setShowAnalysisPanel={setShowAnalysisPanel}
          unifiedScrollRef={unifiedScrollRef}
          error={error}
          overLimit={overLimit}
          blindMode={blindMode}
          setBlindMode={setBlindMode}
          streamingContent={streamingContent}
          handleRegenerate={handleRegenerate}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* Studio panel */}
      {showAnalysisPanel && <AnalysisPanel {...studioProps} />}
    </div>
  );
}
