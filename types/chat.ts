export type Usage = {
  promptTokens: number;
  completionTokens: number;
  cost: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  usage?: Usage;
};

export type Model = {
  id: string;
  name: string;
  icon: string;
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
