const ICON_BASE = "https://unpkg.com/@lobehub/icons-static-png@latest/dark";

// Pricing in USD per 1M tokens
export const MODELS = [
  // ─── Cheapest paid (popular) ──────────────────────────────────────────────
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    icon: `${ICON_BASE}/openai.png`,
    pricing: { prompt: 0.03, completion: 0.14 },
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    icon: `${ICON_BASE}/anthropic.png`,
    pricing: { prompt: 0.25, completion: 1.25 },
  },
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    icon: `${ICON_BASE}/deepseek.png`,
    pricing: { prompt: 0.14, completion: 0.28 },
  },
  {
    id: "google/gemini-2.0-flash-lite-001",
    name: "Gemini 2.0 Flash Lite",
    icon: `${ICON_BASE}/gemini.png`,
    pricing: { prompt: 0.075, completion: 0.3 },
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    name: "Llama 3 8B",
    icon: `${ICON_BASE}/meta.png`,
    pricing: { prompt: 0.03, completion: 0.04 },
  },

  // ─── Free models (rate-limited) ───────────────────────────────────────────
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B (free)",
    icon: `${ICON_BASE}/gemma.png`,
    pricing: { prompt: 0, completion: 0 },
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B (free)",
    icon: `${ICON_BASE}/gemma.png`,
    pricing: { prompt: 0, completion: 0 },
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano (free)",
    icon: `${ICON_BASE}/nvidia.png`,
    pricing: { prompt: 0, completion: 0 },
  },
  {
    id: "tencent/hy3-preview:free",
    name: "Hunyuan 3 (free)",
    icon: `${ICON_BASE}/hunyuan.png`,
    pricing: { prompt: 0, completion: 0 },
  },
  {
    id: "baidu/cobuddy:free",
    name: "Qianfan CoBuddy (free)",
    icon: `${ICON_BASE}/baidu.png`,
    pricing: { prompt: 0, completion: 0 },
  },
];

// 1 credit = $0.0001 (1/100 of a cent). $0.25 budget = 2,500 credits.
export const USD_PER_CREDIT = 0.0001;
export const DAILY_LIMIT_USD = 0.25;
export const DAILY_LIMIT_CREDITS = DAILY_LIMIT_USD / USD_PER_CREDIT;
export const MAX_TOKENS_PER_RESPONSE = 1000;
export const MAX_HISTORY_MESSAGES = 20; // last ~10 exchanges sent to API
export const MAX_INPUT_CHARS = 1000; // user message character cap
export const MAX_SYSTEM_PROMPT_CHARS = 2000; // system prompt character cap
