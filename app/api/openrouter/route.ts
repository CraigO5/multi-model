import { NextResponse } from "next/server";
import { MAX_TOKENS_PER_RESPONSE } from "@/lib/models";
import type { ChatMessage } from "@/types/chat";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body?.messages;
    const model: string = body?.model;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 },
      );
    }

    const prompt: string | null = body?.prompt ?? null;
    const temperature: number | null =
      typeof body?.temperature === "number" ? body.temperature : null;

    const allMessages = prompt
      ? [{ role: "system" as const, content: prompt }, ...messages]
      : messages;

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          stream: true,
          max_tokens: MAX_TOKENS_PER_RESPONSE,
          ...(temperature !== null ? { temperature } : {}),
        }),
        signal: request.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return new Response(null, { status: 499 });
      }
      throw e;
    }

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json(
        { error: "failed to generate response" },
        { status: 500 },
      );
    }

    return new Response(response.body, {
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
    return NextResponse.json(
      { error: "failed to generate response" },
      { status: 500 },
    );
  }
}
