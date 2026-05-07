import { MODELS, USD_PER_CREDIT } from "@/lib/models";

export const CHART_COLORS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export const ANALYSES: Record<
  string,
  { name: string; blurb: string; prompt: string }
> = {
  pickwinner: {
    name: "Pick a winner",
    blurb: "Best answer, with reasoning",
    prompt:
      "Pick the best response and explain why in 2–3 casual sentences. Name the winner in your first sentence. If another model had a genuinely useful angle the winner missed, mention it briefly. No headers, no labels, no bullet points — just write naturally.",
  },
  synthesize: {
    name: "Combine answers",
    blurb: "Merge into one best answer",
    prompt:
      "Synthesize the following AI responses into a single best answer. Note where they agree, flag important disagreements, and produce a clear final answer. Be concise.",
  },
  tldr: {
    name: "TL;DR",
    blurb: "One sentence per model",
    prompt:
      "For each AI response below, output exactly one line in the format:\n\n<model name>: <one-sentence summary capturing the core answer>\n\nNo intros, no headers, no bullet points beyond this. Each summary must be a single sentence under 25 words.",
  },
  factcheck: {
    name: "Key differences",
    blurb: "What each model said differently",
    prompt:
      "Compare the AI responses below and list only the meaningful differences between them — where they gave different information, took different angles, or reached different conclusions. Skip anything they all agree on. Format as a short bulleted list. No intro, no summary.",
  },
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const usdToCredits = (usd: number) => usd / USD_PER_CREDIT;

export const formatCredits = (credits: number) => {
  if (credits === 0) return "0";
  if (credits < 1) return credits.toFixed(2);
  if (credits < 100) return credits.toFixed(1);
  return Math.round(credits).toLocaleString();
};

export const isPaid = (modelId: string) => {
  const m = MODELS.find((x) => x.id === modelId);
  if (!m) return false;
  return m.pricing.prompt > 0 || m.pricing.completion > 0;
};

export const computeCost = (
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

/**
 * Worst-case cost in credits for a request: rough char→token estimate for the
 * prompt plus MAX_TOKENS_PER_RESPONSE for the completion. Used to pre-debit
 * credits before streaming so aborts can't bypass billing.
 */
export const estimateMaxCredits = (
  modelId: string,
  promptCharCount: number,
  maxCompletionTokens: number,
) => {
  const promptTokens = Math.ceil(promptCharCount / 4);
  const cost = computeCost(modelId, promptTokens, maxCompletionTokens);
  return Math.max(1, Math.ceil(cost / USD_PER_CREDIT));
};

export const formatLatency = (ms: number) => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const formatUsd = (usd: number) => {
  if (usd === 0) return "$0";
  if (usd < 0.0001) return "<$0.0001";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
};
