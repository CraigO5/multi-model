import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(templates)
    .where(eq(templates.userId, session.user.id));

  return NextResponse.json(
    rows.map((t) => ({ id: t.id, name: t.name, prompt: t.prompt }))
  );
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, prompt } = await request.json();

  await db.insert(templates).values({
    id,
    userId: session.user.id,
    name,
    prompt,
  });

  return NextResponse.json({ id });
}
