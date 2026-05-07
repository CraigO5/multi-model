import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { getAnonId, getTrialCount, TRIAL_LIMIT } from "@/lib/trial";

export const dynamic = "force-dynamic";

const FREE_CREDITS = 2500;

export async function GET() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    const anonId = await getAnonId();
    const used = anonId ? await getTrialCount(anonId) : 0;
    console.log("[/api/credits] trial user", { anonId, used, limit: TRIAL_LIMIT });
    return NextResponse.json({
      trial: true,
      trialUsed: used,
      trialLimit: TRIAL_LIMIT,
      trialRemaining: Math.max(0, TRIAL_LIMIT - used),
    });
  }

  console.log("[/api/credits] authenticated user", { userId: session.user.id });

  const rows = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, session.user.id))
    .limit(1);

  if (!rows.length) {
    await db.insert(userCredits).values({ userId: session.user.id, balance: FREE_CREDITS }).onConflictDoNothing();
    return NextResponse.json({ trial: false, balance: FREE_CREDITS });
  }

  return NextResponse.json({ trial: false, balance: rows[0].balance });
}
