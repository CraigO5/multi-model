'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      email: fd.get('email') as string,
      name: fd.get('name') as string,
      password: fd.get('password') as string,
    });
    setIsPending(false);
    if (error) {
      setError(error.message || 'Failed to create account. Try again.');
    } else {
      router.push('/chat');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--cz-bg)", color: "var(--cz-text)" }}
    >
      <Link href="/" className="flex items-center gap-3 mb-10">
        <img src="/logo.png" alt="Multi-Model" style={{ width: 30, height: 30, borderRadius: 9 }} />
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>Multi-Model</div>
      </Link>

      <div
        className="w-full max-w-sm flex flex-col gap-6"
        style={{
          background: "rgba(237,230,221,0.04)",
          border: "1px solid rgba(237,230,221,0.08)",
          borderRadius: 18,
          padding: "32px 28px",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Create account</h1>
          <p style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>Start comparing AI responses</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.7 }}>Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Your name"
              style={{
                background: "rgba(237,230,221,0.06)",
                border: "1px solid rgba(237,230,221,0.1)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13.5,
                color: "var(--cz-text)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--cz-accent)")}
              onBlur={e => (e.target.style.borderColor = "rgba(237,230,221,0.1)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.7 }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={{
                background: "rgba(237,230,221,0.06)",
                border: "1px solid rgba(237,230,221,0.1)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13.5,
                color: "var(--cz-text)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--cz-accent)")}
              onBlur={e => (e.target.style.borderColor = "rgba(237,230,221,0.1)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" style={{ fontSize: 12.5, fontWeight: 500, opacity: 0.7 }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{
                background: "rgba(237,230,221,0.06)",
                border: "1px solid rgba(237,230,221,0.1)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13.5,
                color: "var(--cz-text)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--cz-accent)")}
              onBlur={e => (e.target.style.borderColor = "rgba(237,230,221,0.1)")}
            />
          </div>

          {error && <p style={{ fontSize: 12.5, color: "#f87171" }}>{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 4,
              padding: "10px",
              borderRadius: 10,
              background: "var(--cz-accent)",
              color: "#0a0a0d",
              fontWeight: 600,
              fontSize: 13.5,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "opacity 0.12s",
            }}
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ fontSize: 12.5, opacity: 0.5, textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/auth/sign-in" style={{ color: "var(--cz-accent)", opacity: 1, fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
