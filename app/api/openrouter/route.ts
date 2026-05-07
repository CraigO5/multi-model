import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { MAX_TOKENS_PER_RESPONSE, USD_PER_CREDIT } from "@/lib/models";
import { computeCost, estimateMaxCredits } from "@/lib/utils";
import { getOrCreateAnonId, checkTrialAllowed, TRIAL_LIMIT } from "@/lib/trial";
import type { ChatMessage } from "@/types/chat";

const FREE_CREDITS = 500;

async function getOrInitCredits(userId: string): Promise<number> {
  const rows = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
  if (rows.length) return rows[0].balance;
  await db.insert(userCredits).values({ userId, balance: FREE_CREDITS }).onConflictDoNothing();
  return FREE_CREDITS;
}

/**
 * Atomically debit `amount` from the user's balance.
 * Returns the new balance, or null if insufficient.
 */
async function debitCredits(userId: string, amount: number): Promise<number | null> {
  if (amount <= 0) {
    const rows = await db.select({ balance: userCredits.balance }).from(userCredits).where(eq(userCredits.userId, userId)).limit(1);
    return rows[0]?.balance ?? null;
  }
  const rows = await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} - ${amount}`, updatedAt: new Date() })
    .where(sql`${userCredits.userId} = ${userId} AND ${userCredits.balance} >= ${amount}`)
    .returning({ balance: userCredits.balance });
  return rows[0]?.balance ?? null;
}

async function refundCredits(userId: string, amount: number): Promise<number | null> {
  if (amount <= 0) return null;
  const rows = await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} + ${amount}`, updatedAt: new Date() })
    .where(eq(userCredits.userId, userId))
    .returning({ balance: userCredits.balance });
  return rows[0]?.balance ?? null;
}

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id ?? null;

    const body = await request.json();
    const messages: ChatMessage[] = body?.messages;
    const model: string = body?.model;
    const customApiKey: string | null = typeof body?.apiKey === "string" && body.apiKey ? body.apiKey : null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
    }

    const prompt: string | null = body?.prompt ?? null;
    const temperature: number | null = typeof body?.temperature === "number" ? body.temperature : null;

    const allMessages = prompt
      ? [{ role: "system" as const, content: prompt }, ...messages]
      : messages;

    const promptCharCount = allMessages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    const preDebit = estimateMaxCredits(model, promptCharCount, MAX_TOKENS_PER_RESPONSE);

    let preDebitedAmount = 0;

    if (!customApiKey) {
      if (userId) {
        const newBalance = await debitCredits(userId, preDebit);
        if (newBalance === null) {
          return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
        }
        preDebitedAmount = preDebit;
      } else {
        const { id: anonId } = await getOrCreateAnonId();
        const allowed = await checkTrialAllowed(anonId);
        console.log("[/api/openrouter] trial check", { anonId, allowed });
        if (!allowed) {
          return NextResponse.json(
            { error: "trial_exhausted", limit: TRIAL_LIMIT },
            { status: 402 }
          );
        }
      }
    }

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customApiKey ?? process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          stream: true,
          max_tokens: MAX_TOKENS_PER_RESPONSE,
          // OpenRouter: include authoritative cost in the final usage chunk
          usage: { include: true },
          ...(temperature !== null ? { temperature } : {}),
        }),
        signal: request.signal,
      });
    } catch (e) {
      if (userId && preDebitedAmount > 0) await refundCredits(userId, preDebitedAmount).catch(console.error);
      if (e instanceof Error && e.name === "AbortError") {
        return new Response(null, { status: 499 });
      }
      throw e;
    }

    if (!response.ok) {
      if (userId && preDebitedAmount > 0) await refundCredits(userId, preDebitedAmount).catch(console.error);
      if (response.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "failed to generate response" }, { status: 500 });
    }

    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let promptTokens = 0;
        let completionTokens = 0;
        let reportedCostUsd: number | null = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.usage) {
                  promptTokens = json.usage.prompt_tokens ?? promptTokens;
                  completionTokens = json.usage.completion_tokens ?? completionTokens;
                  // OpenRouter reports authoritative USD cost when usage.include is set.
                  if (typeof json.usage.cost === "number") {
                    reportedCostUsd = json.usage.cost;
                  }
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } finally {
          controller.close();

          if (!customApiKey && userId && preDebitedAmount > 0) {
            let actualCredits: number | null = null;
            if (reportedCostUsd !== null) {
              // Source of truth: OpenRouter's reported cost.
              actualCredits = Math.ceil(reportedCostUsd / USD_PER_CREDIT);
            } else if (promptTokens > 0 || completionTokens > 0) {
              // Fallback: compute from local pricing table.
              const actualCost = computeCost(model, promptTokens, completionTokens);
              actualCredits = Math.ceil(actualCost / USD_PER_CREDIT);
            }

            if (actualCredits !== null) {
              const diff = preDebitedAmount - actualCredits;
              if (diff > 0) {
                await refundCredits(userId, diff).catch(console.error);
              } else if (diff < 0) {
                // Actual cost exceeded estimate — debit the remainder.
                await debitCredits(userId, -diff).catch(console.error);
              }
            }
            // No usage at all → keep full pre-debit (worst case).
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    console.error("OpenRouter route failed:", error);
    return NextResponse.json({ error: "failed to generate response" }, { status: 500 });
  }
}
