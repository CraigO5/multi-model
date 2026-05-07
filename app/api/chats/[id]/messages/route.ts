import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { ChatMessage } from "@/types/chat";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: chatId } = await params;

  // Verify chat belongs to user
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(
    rows.map((m): ChatMessage => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      model: m.model,
      synthesis: m.synthesis ?? false,
      usage: m.promptTokens != null
        ? {
            promptTokens: m.promptTokens,
            completionTokens: m.completionTokens ?? 0,
            cost: m.cost ?? 0,
            latencyMs: m.latencyMs ?? undefined,
          }
        : undefined,
    }))
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: chatId } = await params;

  // Verify chat belongs to user
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  await db.insert(messages).values({
    id: body.id,
    chatId,
    role: body.role,
    content: body.content,
    model: body.model ?? null,
    synthesis: body.synthesis ?? false,
    promptTokens: body.usage?.promptTokens ?? null,
    completionTokens: body.usage?.completionTokens ?? null,
    cost: body.usage?.cost ?? null,
    latencyMs: body.usage?.latencyMs ?? null,
  });

  return NextResponse.json({ ok: true });
}
