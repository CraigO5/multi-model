export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
};

export type Model = {
  id: string;
  name: string;
  icon: string;
};
