import { pgTable, text, boolean, integer, real, timestamp } from "drizzle-orm/pg-core";

export const userCredits = pgTable("user_credits", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  model: text("model"),
  synthesis: boolean("synthesis").default(false),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  cost: real("cost"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trialUsage = pgTable("trial_usage", {
  anonId: text("anon_id").primaryKey(),
  count: integer("count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
