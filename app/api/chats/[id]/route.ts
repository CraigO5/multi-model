import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  await db
    .update(chats)
    .set({
      ...(body.title ? { title: body.title } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
