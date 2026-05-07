export type Usage = {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs?: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  usage?: Usage;
  synthesis?: boolean;
};

export type PromptTemplate = {
  id: string;
  name: string;
  prompt: string;
};

export type Model = {
  id: string;
  name: string;
  icon: string;
  color: string;
  initial: string;
  pricing: {
    prompt: number; // USD per 1M tokens
    completion: number; // USD per 1M tokens
  };
};

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type Slot = {
  modelId: string;
  preSplitMessages: ChatMessage[];
  postSplitMessages: ChatMessage[];
  input: string;
  isLoading: boolean;
};
