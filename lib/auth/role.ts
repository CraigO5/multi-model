export type Role = "free" | "pro" | "dev";

export const isProRole = (role: Role): boolean => role === "pro" || role === "dev";

/**
 * Map Better Auth's free-form role string to our app role.
 *
 * Better Auth's admin plugin stores role as plain text on the user row, so any
 * string is accepted — set with `auth.admin.setRole({ userId, role: "pro" })`
 * or directly via `UPDATE "user" SET role = 'pro' WHERE id = ...`.
 *
 * Mapping:
 *   "admin"            → "dev"  (full access)
 *   "pro"              → "pro"  (paid tier; will be set by the Stripe webhook)
 *   anything else/null → "free"
 */
export function resolveRole(user: { role?: string | null } | null | undefined): Role {
  const r = user?.role;
  if (r === "admin" || r === "dev") return "dev";
  if (r === "pro") return "pro";
  return "free";
}

/**
 * Convenience for routes that only have a session in hand.
 * No DB call — pure mapping from the auth user record.
 */
export function getServerRole(
  user: { role?: string | null } | null | undefined,
): Role {
  return resolveRole(user);
}
