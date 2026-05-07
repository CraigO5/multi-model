import Link from "next/link";

export function TrialEndModal() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(10,9,9,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-5"
        style={{
          background: "var(--cz-surface)",
          border: "1px solid rgba(237,230,221,0.1)",
          borderRadius: 20,
          padding: "32px 28px",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center self-start"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--cz-accent-soft)",
          }}
        >
          <img src="/logo.png" alt="" style={{ width: 26, height: 26, borderRadius: 6 }} />
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-1.5">
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--cz-text)" }}>
            You've used your free messages
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.55 }}>
            Create a free account to keep going — you'll get 2,500 credits included, enough for hundreds of comparisons.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/auth/sign-up"
            className="flex items-center justify-center"
            style={{
              padding: "11px",
              borderRadius: 11,
              background: "var(--cz-accent)",
              color: "#0a0a0d",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Create free account
          </Link>
          <Link
            href="/auth/sign-in"
            className="flex items-center justify-center"
            style={{
              padding: "11px",
              borderRadius: 11,
              background: "rgba(237,230,221,0.06)",
              color: "var(--cz-text)",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Sign in
          </Link>
        </div>

        <p style={{ fontSize: 11.5, opacity: 0.35, textAlign: "center" }}>
          No credit card required
        </p>
      </div>
    </div>
  );
}
