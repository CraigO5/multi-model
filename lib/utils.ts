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
  adherence: {
    name: "Check adherence",
    blurb: "Did they follow the system prompt?",
    prompt:
      "Evaluate how well each AI response followed the SYSTEM PROMPT below. Score each model from 1-10 with a one-sentence justification, then summarize which model followed it best.",
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
