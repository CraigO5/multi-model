import Link from "next/link";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { data: session } = await auth.getSession();
  const loggedIn = !!session?.user;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cz-bg)", color: "var(--cz-text)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid rgba(237,230,221,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Multi-Model" style={{ width: 30, height: 30, borderRadius: 9 }} />
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>Multi-Model</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>3 AIs, one chat</div>
          </div>
        </div>

        {loggedIn ? (
          <Link
            href="/chat"
            className="inline-flex items-center"
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              background: "var(--cz-text)",
              color: "#0a0a0d",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Launch app
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              style={{ fontSize: 13, opacity: 0.65, transition: "opacity 0.12s" }}
              className="hover:opacity-100"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center"
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                background: "var(--cz-accent)",
                color: "#0a0a0d",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Sign up
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1
          className="max-w-2xl leading-tight"
          style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)", fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Ask every AI at once.
        </h1>
        <p
          className="mt-6 max-w-xl leading-relaxed"
          style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", opacity: 0.6 }}
        >
          Compare responses from Claude, Gemini, DeepSeek and more — side by side. Pick the best. Stay in control.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center"
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              background: "var(--cz-accent)",
              color: "#0a0a0d",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {loggedIn ? "Go to app" : "Start comparing"}
          </Link>
          {!loggedIn && (
            <Link
              href="/auth/sign-up"
              style={{ fontSize: 13, opacity: 0.45, transition: "opacity 0.12s" }}
              className="hover:opacity-70"
            >
              Create an account
            </Link>
          )}
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left">
          {[
            {
              icon: "🙈",
              title: "Blind Mode",
              desc: "Hide model names and pick your favourite response. Reveal who said what only after you've chosen.",
            },
            {
              icon: "⬛⬛",
              title: "Split View",
              desc: "Give each model its own thread. Drag to reorder, merge back at any time.",
            },
            {
              icon: "✨",
              title: "AI Analysis",
              desc: "Combine answers, compare perspectives, find weak spots, and fact-check with one tap.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: "rgba(237,230,221,0.04)",
                borderRadius: 14,
                padding: "22px 22px",
                border: "1px solid rgba(237,230,221,0.06)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13.5, opacity: 0.6, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Model strip */}
        <p className="mt-16" style={{ fontSize: 11, opacity: 0.35, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Works with GPT · Claude · Gemini · DeepSeek · Llama · and more
        </p>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p style={{ fontSize: 12, opacity: 0.3 }}>
          Built by{" "}
          <a
            href="https://craigo.live"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
            style={{ opacity: 1 }}
          >
            craig
          </a>
        </p>
      </footer>
    </div>
  );
}
