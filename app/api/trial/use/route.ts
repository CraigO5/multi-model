export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getOrCreateAnonId, incrementTrialOrReject, TRIAL_LIMIT } from "@/lib/trial";

export async function POST() {
  const { data: session } = await auth.getSession();
  if (session?.user) {
    console.log("[/api/trial/use] authenticated user — no-op", { userId: session.user.id });
    return NextResponse.json({ ok: true });
  }

  const { id: anonId, created } = await getOrCreateAnonId();
  const newCount = await incrementTrialOrReject(anonId);

  console.log("[/api/trial/use] trial user", { anonId, cookieCreated: created, newCount, limit: TRIAL_LIMIT });

  if (newCount === null) {
    return NextResponse.json({ error: "trial_exhausted", limit: TRIAL_LIMIT }, { status: 402 });
  }

  return NextResponse.json({ ok: true, count: newCount, limit: TRIAL_LIMIT });
}
