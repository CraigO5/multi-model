import { NextResponse } from "next/server";
import { getOpenRouterCompletion } from "@/lib/openrouter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body?.messages;
    const model = body?.model;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 },
      );
    }

    const prompt = body?.prompt ?? null;
    const result = await getOpenRouterCompletion(model, messages, prompt);

    return NextResponse.json({
      completion: result.content,
      usage: result.usage,
    });
  } catch (error: unknown) {
    console.error("OpenRouter route failed:", error);
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 429) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "failed to generate response" },
      { status: 500 },
    );
  }
}
