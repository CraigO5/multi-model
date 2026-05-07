import { cookies } from "next/headers";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trialUsage } from "@/lib/db/schema";

export const TRIAL_LIMIT = 7;
const COOKIE_NAME = "mm_anon_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function newAnonId(): string {
  return crypto.randomUUID();
}

export async function getAnonId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateAnonId(): Promise<{ id: string; created: boolean }> {
  const c = await cookies();
  const existing = c.get(COOKIE_NAME)?.value;
  if (existing) return { id: existing, created: false };
  const id = newAnonId();
  c.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return { id, created: true };
}

export async function getTrialCount(anonId: string): Promise<number> {
  const rows = await db.select().from(trialUsage).where(eq(trialUsage.anonId, anonId)).limit(1);
  return rows[0]?.count ?? 0;
}

/**
 * Check whether the trial is still available (count < TRIAL_LIMIT).
 * Does NOT increment. Used by /api/openrouter to block exhausted users.
 */
export async function checkTrialAllowed(anonId: string): Promise<boolean> {
  const rows = await db.select({ count: trialUsage.count }).from(trialUsage).where(eq(trialUsage.anonId, anonId)).limit(1);
  return (rows[0]?.count ?? 0) < TRIAL_LIMIT;
}

/**
 * Atomically increment the trial counter once per message send (not per model).
 * Returns the new count, or null if already exhausted.
 */
export async function incrementTrialOrReject(anonId: string): Promise<number | null> {
  await db
    .insert(trialUsage)
    .values({ anonId, count: 0 })
    .onConflictDoNothing();

  const rows = await db
    .update(trialUsage)
    .set({ count: sql`${trialUsage.count} + 1`, updatedAt: new Date() })
    .where(sql`${trialUsage.anonId} = ${anonId} AND ${trialUsage.count} < ${TRIAL_LIMIT}`)
    .returning({ count: trialUsage.count });

  return rows[0]?.count ?? null;
}
