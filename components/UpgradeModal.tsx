"use client";

import { useState } from "react";
import { X as PhX } from "@phosphor-icons/react";

type Props = {
  onClose: () => void;
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Try the product",
    cta: "Current plan",
    ctaDisabled: true,
    accent: false,
    features: [
      "Standard models only",
      "500 credits / day",
      "Up to 3 AIs at once",
      "7-day chat history",
      "Basic analysis tools",
    ],
    missing: ["GPT-4o, Claude Opus, Gemini 2.5 Pro", "Blind mode", "Analytics dashboard"],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    description: "Unlock the flagship models",
    cta: "Get Pro",
    ctaDisabled: false,
    accent: true,
    badge: "Most popular",
    features: [
      "GPT-4o, Claude Opus 4, Sonnet 4.5",
      "Gemini 2.5 Pro, Grok 3, DeepSeek R1",
      "50,000 credits / month",
      "Blind mode & analytics",
      "Full chat history",
      "Email support",
    ],
    missing: [],
  },
  {
    name: "Team",
    price: "$39",
    period: "/mo",
    description: "For small teams",
    cta: "Get Team",
    ctaDisabled: false,
    accent: false,
    features: [
      "Everything in Pro",
      "Up to 5 seats",
      "200,000 credits / month",
      "Shared chat history",
      "Priority email support",
      "Invoice billing",
    ],
    missing: [],
  },
];

export function UpgradeModal({ onClose }: Props) {
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{
          background: "var(--cz-surface)",
          border: "1px solid rgba(237,230,221,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "28px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Unlock more with&nbsp;
              <span style={{ color: "var(--cz-accent)" }}>Multi Model</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>
              Compare smarter. Spend less. Get better answers.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: 0, color: "inherit", opacity: 0.4, cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget.style.opacity = "1"); (e.currentTarget.style.background = "rgba(237,230,221,0.06)"); }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = "0.4"); (e.currentTarget.style.background = "transparent"); }}
          >
            <PhX size={16} />
          </button>
        </div>

        {/* Tiers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: 28 }}>
          {TIERS.map((tier, idx) => (
            <div
              key={tier.name}
              onMouseEnter={() => setHoveredTier(idx)}
              onMouseLeave={() => setHoveredTier(null)}
              style={{
                position: "relative",
                borderRadius: 14,
                padding: "22px 18px",
                border: tier.accent
                  ? "1.5px solid rgba(107,207,127,0.5)"
                  : "1px solid rgba(237,230,221,0.07)",
                background: tier.accent
                  ? "linear-gradient(160deg, rgba(107,207,127,0.07) 0%, rgba(107,207,127,0.03) 100%)"
                  : hoveredTier === idx
                    ? "rgba(237,230,221,0.03)"
                    : "rgba(237,230,221,0.02)",
                transition: "background 0.15s, border-color 0.15s",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {tier.badge && (
                <div style={{
                  position: "absolute",
                  top: -11,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--cz-accent)",
                  color: "#0a0a0d",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 99,
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}>
                  {tier.badge}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {tier.name}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: tier.accent ? "var(--cz-accent)" : "var(--cz-text)" }}>
                  {tier.price}
                </span>
                {tier.period && <span style={{ fontSize: 13, opacity: 0.45 }}>{tier.period}</span>}
              </div>

              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 18, lineHeight: 1.4 }}>
                {tier.description}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                {tier.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, lineHeight: 1.4 }}>
                    <span style={{ color: "var(--cz-accent)", flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ opacity: 0.8 }}>{f}</span>
                  </div>
                ))}
                {tier.missing.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, lineHeight: 1.4 }}>
                    <span style={{ opacity: 0.25, flexShrink: 0, marginTop: 1 }}>✗</span>
                    <span style={{ opacity: 0.25, textDecoration: "line-through" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={tier.ctaDisabled}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: tier.ctaDisabled ? "default" : "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  background: tier.accent
                    ? "var(--cz-accent)"
                    : tier.ctaDisabled
                      ? "rgba(237,230,221,0.05)"
                      : "rgba(237,230,221,0.08)",
                  color: tier.accent ? "#0a0a0d" : tier.ctaDisabled ? "rgba(237,230,221,0.3)" : "var(--cz-text)",
                  boxShadow: tier.accent ? "0 0 20px rgba(107,207,127,0.2)" : "none",
                }}
                onMouseEnter={e => {
                  if (!tier.ctaDisabled) {
                    if (tier.accent) {
                      (e.currentTarget.style.boxShadow = "0 0 30px rgba(107,207,127,0.4)");
                      (e.currentTarget.style.transform = "translateY(-1px)");
                    } else {
                      (e.currentTarget.style.background = "rgba(237,230,221,0.12)");
                    }
                  }
                }}
                onMouseLeave={e => {
                  if (tier.accent) {
                    (e.currentTarget.style.boxShadow = "0 0 20px rgba(107,207,127,0.2)");
                    (e.currentTarget.style.transform = "translateY(0)");
                  } else if (!tier.ctaDisabled) {
                    (e.currentTarget.style.background = "rgba(237,230,221,0.08)");
                  }
                }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", paddingBottom: 20, fontSize: 11, opacity: 0.3 }}>
          All plans include end-to-end encryption and zero data retention.
        </div>
      </div>
    </div>
  );
}
