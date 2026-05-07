"use client";

import Link from "next/link";

type Props = {
  feature: string | null;
  onClose: () => void;
};

export function LockedFeatureModal({ feature, onClose }: Props) {
  if (!feature) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(10,10,13,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-7 py-8 text-center"
        style={{
          background: "var(--cz-surface)",
          border: "1px solid rgba(237,230,221,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/logo.png"
          alt="Multi-Model"
          style={{ width: 38, height: 38, borderRadius: 11, margin: "0 auto 14px" }}
        />
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
          {feature} is for members
        </h2>
        <p style={{ fontSize: 13.5, opacity: 0.6, lineHeight: 1.55, marginBottom: 22 }}>
          Create a free account to unlock this and get 2,500 free credits.
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center justify-center"
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              background: "var(--cz-accent)",
              color: "#0a0a0d",
              fontWeight: 600,
              fontSize: 13.5,
            }}
          >
            Create free account
          </Link>
          <Link
            href="/auth/sign-in"
            style={{ fontSize: 12.5, opacity: 0.55, padding: "4px" }}
          >
            Already have an account? Sign in
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-3 cursor-pointer"
          style={{ fontSize: 12, opacity: 0.35, padding: "4px" }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
