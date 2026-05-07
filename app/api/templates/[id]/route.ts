import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
