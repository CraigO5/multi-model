const ICON_BASE = "https://unpkg.com/@lobehub/icons-static-png@latest/dark";

// Pricing in USD per 1M tokens
export const MODELS = [
  // ─── Standard models (available to all users) ─────────────────────────────
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    icon: `${ICON_BASE}/openai.png`,
    color: "#10a37f",
    initial: "G",
    pricing: { prompt: 0.03, completion: 0.14 },
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    icon: `${ICON_BASE}/anthropic.png`,
    color: "#D97757",
    initial: "C",
    pricing: { prompt: 0.25, completion: 1.25 },
  },
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    icon: `${ICON_BASE}/deepseek.png`,
    color: "#6B8AFD",
    initial: "D",
    pricing: { prompt: 0.14, completion: 0.28 },
  },
  {
    id: "google/gemini-2.0-flash-lite-001",
    name: "Gemini 2.0 Flash Lite",
    icon: `${ICON_BASE}/gemini.png`,
    color: "#7CC4A0",
    initial: "G",
    pricing: { prompt: 0.075, completion: 0.3 },
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    name: "Llama 3 8B",
    icon: `${ICON_BASE}/meta.png`,
    color: "#0066ff",
    initial: "L",
    pricing: { prompt: 0.03, completion: 0.04 },
  },

  // ─── Pro models (require Pro plan) ───────────────────────────────────────
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    icon: `${ICON_BASE}/openai.png`,
    color: "#10a37f",
    initial: "G",
    pricing: { prompt: 2.5, completion: 10 },
    requiresPro: true,
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    icon: `${ICON_BASE}/anthropic.png`,
    color: "#D97757",
    initial: "C",
    pricing: { prompt: 15, completion: 75 },
    requiresPro: true,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    icon: `${ICON_BASE}/anthropic.png`,
    color: "#D97757",
    initial: "C",
    pricing: { prompt: 3, completion: 15 },
    requiresPro: true,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    icon: `${ICON_BASE}/gemini.png`,
    color: "#7CC4A0",
    initial: "G",
    pricing: { prompt: 1.25, completion: 10 },
    requiresPro: true,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    icon: `${ICON_BASE}/deepseek.png`,
    color: "#6B8AFD",
    initial: "D",
    pricing: { prompt: 0.55, completion: 2.19 },
    requiresPro: true,
  },
  {
    id: "x-ai/grok-3",
    name: "Grok 3",
    icon: `${ICON_BASE}/grok.png`,
    color: "#FFFFFF",
    initial: "X",
    pricing: { prompt: 3, completion: 15 },
    requiresPro: true,
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B",
    icon: `${ICON_BASE}/meta.png`,
    color: "#0066ff",
    initial: "L",
    pricing: { prompt: 2.7, completion: 2.7 },
    requiresPro: true,
  },
];

// 1 credit = $0.0001 (1/100 of a cent). $0.25 budget = 2,500 credits.
export const USD_PER_CREDIT = 0.0001;
export const DAILY_LIMIT_USD = 0.25;
export const DAILY_LIMIT_CREDITS = DAILY_LIMIT_USD / USD_PER_CREDIT;
export const MAX_TOKENS_PER_RESPONSE = 1000;

// Pro-only response length presets. Free users are pinned to DEFAULT_RESPONSE_LENGTH.
export const RESPONSE_LENGTHS = {
  short:  { label: "Short",      maxTokens: 300,  hint: "~1 short paragraph",     targetWords: "around 80–150 words" },
  medium: { label: "Medium",     maxTokens: 1000, hint: "Default — balanced",     targetWords: "around 300–500 words" },
  long:   { label: "Long",       maxTokens: 2500, hint: "Detailed answers",        targetWords: "around 800–1,200 words" },
  xlong:  { label: "Extra long", maxTokens: 4000, hint: "Comprehensive write-ups", targetWords: "1,500+ words" },
} as const;
export type ResponseLength = keyof typeof RESPONSE_LENGTHS;
export const DEFAULT_RESPONSE_LENGTH: ResponseLength = "medium";
export const MAX_HISTORY_MESSAGES = 20; // last ~10 exchanges sent to API
export const MAX_INPUT_CHARS = 1000; // user message character cap
export const MAX_SYSTEM_PROMPT_CHARS = 2000; // system prompt character cap
