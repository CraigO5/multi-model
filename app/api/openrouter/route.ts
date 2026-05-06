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

    const completion = await getOpenRouterCompletion(model, messages);

    return NextResponse.json({ completion });
  } catch (error) {
    console.error("OpenRouter route failed:", error);
    return NextResponse.json(
      { error: "failed to generate response" },
      { status: 500 },
    );
  }
}
