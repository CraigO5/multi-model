import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { getAnonId, getTrialCount, TRIAL_LIMIT } from "@/lib/trial";
import { getServerRole } from "@/lib/auth/role";

export const dynamic = "force-dynamic";

const FREE_CREDITS = 500;

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
      role: "free",
    });
  }

  console.log("[/api/credits] authenticated user", { userId: session.user.id });

  const role = getServerRole(session.user);
  const rows = await db.select().from(userCredits).where(eq(userCredits.userId, session.user.id)).limit(1);

  if (!rows.length) {
    await db.insert(userCredits).values({ userId: session.user.id, balance: FREE_CREDITS }).onConflictDoNothing();
    return NextResponse.json({ trial: false, balance: FREE_CREDITS, role });
  }

  return NextResponse.json({ trial: false, balance: rows[0].balance, role });
}
