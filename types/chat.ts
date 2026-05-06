export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
};
