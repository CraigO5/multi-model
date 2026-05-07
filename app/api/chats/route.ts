import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, session.user.id))
    .orderBy(desc(chats.updatedAt));

  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      title: c.title,
      messages: [],
      createdAt: c.createdAt.getTime(),
      updatedAt: c.updatedAt.getTime(),
    }))
  );
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title } = await request.json();

  await db.insert(chats).values({
    id,
    userId: session.user.id,
    title,
  });

  return NextResponse.json({ id });
}
