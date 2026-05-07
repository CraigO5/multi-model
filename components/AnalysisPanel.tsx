"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import type { ChatMessage, PromptTemplate } from "@/types/chat";
import { MAX_SYSTEM_PROMPT_CHARS, RESPONSE_LENGTHS, DEFAULT_RESPONSE_LENGTH, type ResponseLength } from "@/lib/models";
import { ANALYSES } from "@/lib/utils";
import { TrashIcon } from "@/components/icons";
import { MODELS } from "@/lib/models";
import { isPaid, isProModel } from "@/lib/utils";
import { type Icon, Trophy, Checks, FlowArrow, ListBullets, X as PhX, ChartLineUp, SlidersHorizontal, Textbox, CaretDown, Cpu, Lock, ArrowsOutLineVertical } from "@phosphor-icons/react";
import { UpgradeModal } from "@/components/UpgradeModal";

type Props = {
  latestResponses: ChatMessage[];
  canAnalyze: boolean;
  analysisModelId: string;
  setAnalysisModelId: (id: string) => void;
  analysisPrompt: string;
  setAnalysisPrompt: (p: string) => void;
  isAnalyzing: boolean;
  isRateLimited: (modelId: string) => boolean;
  setShowAnalysisPanel: (show: boolean) => void;
  showAnalysisPanel: boolean;
  handleAnalysis: (preset: keyof typeof ANALYSES | "custom", customText?: string) => void;
  view: "chat" | "analytics";
  setView: (v: "chat" | "analytics") => void;
  systemPrompt: string;
  setSystemPrompt: (p: string) => void;
  showTemplates: boolean;
  setShowTemplates: (s: boolean) => void;
  templates: PromptTemplate[];
  saveTemplate: () => void;
  loadTemplate: (t: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
  role: "free" | "pro" | "dev";
};

const COZY_ACTIONS: { key: "pickwinner" | "synthesize" | "tldr" | "factcheck"; Icon: Icon; label: string; sub: string; emoji: string; primary?: boolean }[] = [
  { key: "pickwinner", Icon: Trophy, label: "Pick a winner", sub: "Best answer with reasoning", emoji: "🏆", primary: true },
  { key: "synthesize", Icon: FlowArrow, label: "Combine answers", sub: "Merge into one best answer", emoji: "✨" },
  { key: "tldr", Icon: ListBullets, label: "TL;DR", sub: "One sentence per model", emoji: "📝" },
  { key: "factcheck", Icon: Checks, label: "Key differences", sub: "What each model said differently", emoji: "↕" },
];

const TIPS = [
  "Try asking the same thing you'd Google. Three perspectives often beats one.",
  "Use Blind mode to pick your favorite answer without bias.",
  "Split view lets you dive deeper into one model's reasoning.",
  "Ask follow-ups to get better answers. Each model thinks differently.",
  "Combine answers to get the best of all three models.",
  "Check facts across models to spot disagreements.",
];

function AnalysisModelPicker({
  analysisModelId,
  setAnalysisModelId,
  isAnalyzing,
  isRateLimited,
}: {
  analysisModelId: string;
  setAnalysisModelId: (id: string) => void;
  isAnalyzing: boolean;
  isRateLimited: (id: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentModel = MODELS.find((m) => m.id === analysisModelId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const standard = MODELS.filter((m) => !isProModel(m.id));
  const pro = MODELS.filter((m) => isProModel(m.id));

  const renderOption = (m: typeof MODELS[number]) => {
    const limited = isRateLimited(m.id);
    const proGated = isProModel(m.id);
    const selected = m.id === analysisModelId;
    const disabled = limited || proGated;
    return (
      <button
        key={m.id}
        onClick={() => { if (!disabled) { setAnalysisModelId(m.id); setOpen(false); } }}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: 0,
          background: selected ? "var(--cz-accent-soft)" : "transparent",
          color: disabled ? "rgba(237,230,221,0.35)" : selected ? "var(--cz-accent)" : "rgba(237,230,221,0.82)",
          fontSize: 12.5,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          textDecoration: limited ? "line-through" : "none",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!disabled && !selected) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <img src={m.icon} alt={m.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain", opacity: disabled ? 0.3 : 1, flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
        {proGated && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(107,207,127,0.12)", border: "1px solid rgba(107,207,127,0.25)", color: "var(--cz-accent)", padding: "2px 6px", borderRadius: 99, letterSpacing: "0.04em" }}>PRO</span>}
        {limited && !proGated && <span style={{ fontSize: 10, opacity: 0.5 }}>rate limited</span>}
      </button>
    );
  };

  return (
    <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
      <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        <Cpu size={13} />
        Analysis model
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => !isAnalyzing && setOpen((v) => !v)}
          disabled={isAnalyzing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: 0,
            background: "rgba(237,230,221,0.05)",
            color: "var(--cz-text)",
            fontSize: 12.5,
            fontFamily: "inherit",
            cursor: isAnalyzing ? "not-allowed" : "pointer",
            opacity: isAnalyzing ? 0.5 : 1,
            transition: "background 0.1s",
          }}
          onMouseEnter={e => { if (!isAnalyzing) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.09)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.05)"; }}
        >
          {currentModel && (
            <img src={currentModel.icon} alt={currentModel.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain", flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentModel?.name ?? "Select model"}
          </span>
          <CaretDown size={12} style={{ opacity: 0.5, flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 60,
              background: "var(--cz-surface)",
              border: "1px solid rgba(237,230,221,0.08)",
              borderRadius: 10,
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              padding: 4,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {standard.length > 0 && (
              <>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.35, padding: "6px 10px 3px" }}>
                  Standard
                </div>
                {standard.map(renderOption)}
              </>
            )}
            {pro.length > 0 && (
              <>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cz-accent)", opacity: 0.7, padding: "10px 10px 3px" }}>
                  ✦ Pro
                </div>
                {pro.map(renderOption)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const RoleContext = createContext<"free" | "pro" | "dev">("free");
const useIsPro = () => {
  const r = useContext(RoleContext);
  return r === "pro" || r === "dev";
};

function ApiKeySection({ onOpenUpgrade }: { onOpenUpgrade: () => void }) {
  const isPro = useIsPro();
  const [open, setOpen] = useState(false);
  const [keyType, setKeyType] = useState<"openrouter" | "openai">("openrouter");
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    const k = localStorage.getItem("mm_api_key");
    if (k) setSaved(k);
  }, []);

  const masked = saved ? `${saved.slice(0, 8)}…${saved.slice(-4)}` : null;

  const saveKey = async () => {
    if (!input.trim()) return;
    setValidating(true);
    setValid(null);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${input.trim()}` },
      });
      const ok = res.ok;
      setValid(ok);
      if (ok) {
        localStorage.setItem("mm_api_key", input.trim());
        setSaved(input.trim());
        setInput("");
      }
    } catch {
      setValid(false);
    } finally {
      setValidating(false);
    }
  };

  const clearKey = () => {
    localStorage.removeItem("mm_api_key");
    setSaved(null);
    setValid(null);
    setInput("");
  };

  if (!isPro) {
    return (
      <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
        <button
          onClick={onOpenUpgrade}
          style={{
            width: "100%", background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500,
            cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7,
            fontFamily: "inherit", transition: "opacity 0.12s", opacity: 0.55,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
        >
          <span style={{ fontSize: 14 }}>🔑</span>
          API Key
          <span style={{ marginLeft: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 10, background: "rgba(107,207,127,0.08)", border: "1px solid rgba(107,207,127,0.2)", color: "var(--cz-accent)", padding: "2px 7px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em" }}>
            <Lock size={9} weight="bold" />
            PRO
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>Upgrade</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500, cursor: "pointer", opacity: 0.65, padding: 0, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "opacity 0.12s", width: "100%" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
      >
        <span style={{ fontSize: 14 }}>🔑</span>
        API Key
        {saved && <span style={{ marginLeft: 4, fontSize: 10, background: "var(--cz-accent-soft)", color: "var(--cz-accent)", padding: "2px 7px", borderRadius: 99, fontWeight: 600 }}>Active</span>}
        <CaretDown size={16} weight="bold" style={{ marginLeft: "auto", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.8 }} />
      </button>

      {open && (
        <div style={{ marginTop: 12 }} className="animate-expand-in">
          {/* Security explanation */}
          <div style={{ background: "rgba(107,207,127,0.06)", border: "1px solid rgba(107,207,127,0.15)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cz-accent)", marginBottom: 4 }}>🔒 How your key is protected</div>
            <div style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.55 }}>
              Your key is <strong>stored only in this browser</strong> — it never touches our servers or database. Each request sends it directly over HTTPS and it&apos;s discarded immediately after.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {[
                { icon: "🔒", label: "Browser-only" },
                { icon: "✅", label: "HTTPS only" },
                { icon: "🛡", label: "Never logged" },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, background: "rgba(107,207,127,0.08)", border: "1px solid rgba(107,207,127,0.18)", borderRadius: 99, padding: "3px 8px", color: "var(--cz-accent)" }}>
                  <span>{icon}</span>
                  <span style={{ fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key type tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "rgba(237,230,221,0.04)", borderRadius: 8, padding: 3 }}>
            {(["openrouter", "openai"] as const).map((type) => {
              const labels = { openrouter: "OpenRouter", openai: "OpenAI (soon)" };
              const selected = keyType === type;
              const disabled = type === "openai";
              return (
                <button
                  key={type}
                  onClick={() => !disabled && setKeyType(type)}
                  disabled={disabled}
                  style={{
                    flex: 1, padding: "6px 8px", borderRadius: 6, border: 0, fontSize: 11.5, fontWeight: 500, fontFamily: "inherit",
                    cursor: disabled ? "not-allowed" : "pointer",
                    background: selected ? "rgba(237,230,221,0.09)" : "transparent",
                    color: disabled ? "rgba(237,230,221,0.25)" : selected ? "var(--cz-text)" : "rgba(237,230,221,0.5)",
                    transition: "all 0.12s",
                  }}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          {/* Key input or saved display */}
          {saved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, background: "rgba(237,230,221,0.04)", border: "1px solid rgba(237,230,221,0.08)", borderRadius: 8, padding: "8px 11px", fontSize: 12, fontFamily: "monospace", opacity: 0.7 }}>
                {masked}
              </div>
              <button
                onClick={clearKey}
                style={{ fontSize: 11.5, opacity: 0.55, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s", whiteSpace: "nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="password"
                placeholder={keyType === "openrouter" ? "sk-or-..." : "sk-..."}
                value={input}
                onChange={e => { setInput(e.target.value); setValid(null); }}
                onKeyDown={e => { if (e.key === "Enter") saveKey(); }}
                style={{
                  flex: 1, background: "rgba(237,230,221,0.04)", border: `1px solid ${valid === false ? "rgba(239,68,68,0.4)" : "rgba(237,230,221,0.08)"}`, borderRadius: 8, padding: "8px 11px",
                  fontSize: 12, fontFamily: "monospace", color: "var(--cz-text)", outline: 0, transition: "border-color 0.12s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(107,207,127,0.35)")}
                onBlur={e => (e.currentTarget.style.borderColor = valid === false ? "rgba(239,68,68,0.4)" : "rgba(237,230,221,0.08)")}
              />
              <button
                onClick={saveKey}
                disabled={!input.trim() || validating}
                style={{
                  background: "var(--cz-accent-soft)", border: "1px solid rgba(107,207,127,0.25)", color: "var(--cz-accent)", fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8, cursor: input.trim() && !validating ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: input.trim() && !validating ? 1 : 0.45, transition: "all 0.12s", whiteSpace: "nowrap",
                }}
              >
                {validating ? "Checking…" : "Save"}
              </button>
            </div>
          )}

          {valid === false && (
            <div style={{ fontSize: 11.5, color: "#f87171", marginTop: 6 }}>Key invalid or couldn&apos;t be verified. Check and try again.</div>
          )}

          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8, lineHeight: 1.45 }}>
            {saved
              ? "Your key is active. Requests bypass credits and go directly through your account."
              : "Using your own key bypasses the credit system entirely."}
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseLengthSection({ onOpenUpgrade }: { onOpenUpgrade: () => void }) {
  const isPro = useIsPro();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ResponseLength>(DEFAULT_RESPONSE_LENGTH);

  useEffect(() => {
    const v = localStorage.getItem("mm_response_length");
    if (v && v in RESPONSE_LENGTHS) setSelected(v as ResponseLength);
  }, []);

  const choose = (key: ResponseLength) => {
    setSelected(key);
    localStorage.setItem("mm_response_length", key);
    window.dispatchEvent(new Event("mm_response_length_changed"));
  };

  if (!isPro) {
    return (
      <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
        <button
          onClick={onOpenUpgrade}
          style={{
            width: "100%", background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500,
            cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7,
            fontFamily: "inherit", transition: "opacity 0.12s", opacity: 0.55,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
        >
          <ArrowsOutLineVertical size={14} />
          Response length
          <span style={{ marginLeft: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 10, background: "rgba(107,207,127,0.08)", border: "1px solid rgba(107,207,127,0.2)", color: "var(--cz-accent)", padding: "2px 7px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em" }}>
            <Lock size={9} weight="bold" />
            PRO
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>Upgrade</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500, cursor: "pointer", opacity: 0.65, padding: 0, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "opacity 0.12s", width: "100%" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
      >
        <ArrowsOutLineVertical size={14} />
        Response length
        <span style={{ marginLeft: 4, fontSize: 10, background: "rgba(237,230,221,0.06)", color: "rgba(237,230,221,0.65)", padding: "2px 7px", borderRadius: 99, fontWeight: 600 }}>
          {RESPONSE_LENGTHS[selected].label}
        </span>
        <CaretDown size={16} weight="bold" style={{ marginLeft: "auto", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.8 }} />
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }} className="animate-expand-in">
          {(Object.keys(RESPONSE_LENGTHS) as ResponseLength[]).map((key) => {
            const cfg = RESPONSE_LENGTHS[key];
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => choose(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 11px", borderRadius: 8, border: 0, fontFamily: "inherit",
                  background: isSelected ? "var(--cz-accent-soft)" : "rgba(237,230,221,0.04)",
                  color: "inherit", cursor: "pointer", textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.04)"; }}
              >
                <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid ${isSelected ? "var(--cz-accent)" : "rgba(237,230,221,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cz-accent)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? "var(--cz-accent)" : "inherit" }}>
                    {cfg.label}
                    <span style={{ fontSize: 10, opacity: 0.45, fontWeight: 500, marginLeft: 6 }}>
                      ~{cfg.maxTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{cfg.hint}</div>
                </div>
              </button>
            );
          })}
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4, lineHeight: 1.45 }}>
            Longer responses cost more credits per request.
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalysisPanel({
  latestResponses,
  canAnalyze,
  analysisModelId,
  setAnalysisModelId,
  analysisPrompt,
  setAnalysisPrompt,
  isAnalyzing,
  isRateLimited,
  setShowAnalysisPanel,
  showAnalysisPanel,
  handleAnalysis,
  view,
  setView,
  systemPrompt,
  setSystemPrompt,
  showTemplates,
  setShowTemplates,
  templates,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
  role,
}: Props) {
  const [showContext, setShowContext] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTipIndex((prev) => (prev + 1) % TIPS.length), 8000);
    return () => clearInterval(timer);
  }, []);

  const close = () => setShowAnalysisPanel(false);

  const drawerTransform = showAnalysisPanel
    ? "translate(0, 0)"
    : isDesktop
      ? "translateX(100%)"
      : "translateY(100%)";

  return (
    <RoleContext.Provider value={role}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: showAnalysisPanel ? 1 : 0,
          pointerEvents: showAnalysisPanel ? "auto" : "none",
        }}
        onClick={close}
      />

      {/* Drawer */}
      <aside
        className="fixed z-50 flex flex-col"
        style={{
          background: "var(--cz-surface)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          transform: drawerTransform,
          /* Mobile: bottom sheet */
          ...(isDesktop ? {
            top: 0,
            right: 0,
            bottom: 0,
            width: 296,
            borderLeft: "1px solid rgba(237,230,221,0.07)",
            overflow: "hidden",
          } : {
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "82vh",
            borderRadius: "16px 16px 0 0",
            borderTop: "1px solid rgba(237,230,221,0.07)",
            overflow: "hidden",
          }),
        }}
      >
        {/* Mobile drag handle */}
        {!isDesktop && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div style={{ width: 32, height: 4, background: "rgba(237,230,221,0.12)", borderRadius: 2 }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "18px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal size={15} style={{ opacity: 0.6 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Settings</span>
          </div>
          <button
            onClick={close}
            style={{ background: "transparent", border: 0, color: "inherit", opacity: 0.4, cursor: "pointer", padding: "5px", borderRadius: 6, display: "flex", alignItems: "center" }}
            onMouseEnter={e => { (e.currentTarget.style.opacity = "1"); (e.currentTarget.style.background = "rgba(237,230,221,0.06)"); }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = "0.4"); (e.currentTarget.style.background = "transparent"); }}
          >
            <PhX size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Analytics toggle */}
          <div style={{ paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
            <button
              onClick={() => setView(view === "analytics" ? "chat" : "analytics")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                padding: "10px 14px",
                borderRadius: 10,
                border: 0,
                cursor: "pointer",
                color: "inherit",
                background: view === "analytics" ? "var(--cz-accent-soft)" : "rgba(237,230,221,0.04)",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (view !== "analytics") (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; }}
              onMouseLeave={e => { if (view !== "analytics") (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.04)"; }}
            >
              <ChartLineUp size={15} />
              <span style={{ color: view === "analytics" ? "var(--cz-accent)" : "inherit" }}>Analytics</span>
            </button>
          </div>

          {/* API Key */}
          <ApiKeySection onOpenUpgrade={() => { close(); setShowUpgrade(true); }} />

          {/* Response length */}
          <ResponseLengthSection onOpenUpgrade={() => { close(); setShowUpgrade(true); }} />

          {/* Context / system prompt */}
          <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
            <button
              onClick={() => setShowContext(!showContext)}
              style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500, cursor: "pointer", opacity: 0.65, padding: 0, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "opacity 0.12s", width: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
            >
              <Textbox size={14} />
              Give the AIs some context
              <CaretDown size={16} weight="bold" style={{ marginLeft: "auto", transition: "transform 0.2s", transform: showContext ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.8 }} />
            </button>
            {showContext && (
              <div style={{ marginTop: 10 }} className="animate-expand-in">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value.slice(0, MAX_SYSTEM_PROMPT_CHARS))}
                  placeholder="e.g. I'm a 4th grade teacher writing letters home to parents…"
                  rows={4}
                  style={{
                    width: "100%",
                    minHeight: 70,
                    background: "rgba(237,230,221,0.04)",
                    border: 0,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "var(--cz-text)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: 0,
                    transition: "background 0.12s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => (e.currentTarget.style.background = "rgba(237,230,221,0.08)")}
                  onBlur={e => (e.currentTarget.style.background = "rgba(237,230,221,0.04)")}
                />
                <div style={{ fontSize: 11.5, opacity: 0.45, marginTop: 8, lineHeight: 1.4 }}>
                  Helps every answer fit your situation. Optional.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <p style={{ fontSize: 11, opacity: systemPrompt.length >= MAX_SYSTEM_PROMPT_CHARS ? 1 : 0.4, color: systemPrompt.length >= MAX_SYSTEM_PROMPT_CHARS ? "#f87171" : "inherit" }}>
                    {systemPrompt.length}/{MAX_SYSTEM_PROMPT_CHARS}
                  </p>
                  <button
                    onClick={saveTemplate}
                    disabled={!systemPrompt.trim()}
                    style={{ fontSize: 11.5, opacity: systemPrompt.trim() ? 0.65 : 0.3, background: "transparent", border: 0, color: "inherit", cursor: systemPrompt.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                    onMouseEnter={e => { if (systemPrompt.trim()) (e.currentTarget.style.opacity = "1"); }}
                    onMouseLeave={e => { if (systemPrompt.trim()) (e.currentTarget.style.opacity = "0.65"); }}
                  >
                    Save as template
                  </button>
                </div>
                {templates.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      style={{ fontSize: 11.5, opacity: 0.65, background: "transparent", border: 0, color: "inherit", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 5, transition: "opacity 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
                    >
                      Templates ({templates.length})
                      <CaretDown size={11} style={{ transition: "transform 0.2s", transform: showTemplates ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>
                    {showTemplates && (
                      <div style={{ marginTop: 6, borderRadius: 10, padding: 4, background: "rgba(237,230,221,0.04)" }} className="animate-expand-in">
                        {templates.map((t) => (
                          <div key={t.id} className="group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", borderRadius: 8 }}>
                            <button
                              onClick={() => loadTemplate(t)}
                              style={{ fontSize: 12, opacity: 0.65, background: "transparent", border: 0, color: "inherit", cursor: "pointer", flex: 1, textAlign: "left", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
                            >
                              {t.name}
                            </button>
                            <button
                              onClick={() => deleteTemplate(t.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              style={{ background: "transparent", border: 0, color: "inherit", padding: 2 }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#E89B9B")}
                              onMouseLeave={e => (e.currentTarget.style.color = "inherit")}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analysis model */}
          <AnalysisModelPicker
            analysisModelId={analysisModelId}
            setAnalysisModelId={setAnalysisModelId}
            isAnalyzing={isAnalyzing}
            isRateLimited={isRateLimited}
          />

          {/* What would you like to do? */}
          <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
            <div style={{ fontSize: 11.5, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>
              What would you like to do?
            </div>

            {latestResponses.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.4 }}>Send a message first.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {COZY_ACTIONS.map((a) => {
                  const disabled = !canAnalyze || isAnalyzing;
                  return (
                    <button
                      key={a.key}
                      onClick={() => !disabled && handleAnalysis(a.key)}
                      disabled={disabled}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        background: a.primary ? "var(--cz-accent-soft)" : "rgba(237,230,221,0.04)",
                        border: 0,
                        color: "inherit",
                        padding: "10px 12px",
                        borderRadius: 10,
                        cursor: disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        opacity: disabled ? 0.4 : 1,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = a.primary ? "rgba(168,181,160,0.2)" : "rgba(237,230,221,0.08)"; }}
                      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = a.primary ? "var(--cz-accent-soft)" : "rgba(237,230,221,0.04)"; }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{a.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: a.primary ? "var(--cz-accent)" : "inherit" }}>{a.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{a.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <textarea
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                placeholder="Or ask anything about the responses…"
                rows={2}
                disabled={isAnalyzing}
                style={{
                  width: "100%",
                  background: "rgba(237,230,221,0.04)",
                  border: 0,
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "var(--cz-text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "none",
                  outline: 0,
                  boxSizing: "border-box",
                  transition: "background 0.12s",
                }}
                onFocus={e => (e.currentTarget.style.background = "rgba(237,230,221,0.08)")}
                onBlur={e => (e.currentTarget.style.background = "rgba(237,230,221,0.04)")}
              />
              <button
                onClick={() => handleAnalysis("custom", analysisPrompt)}
                disabled={!canAnalyze || !analysisPrompt.trim() || isAnalyzing}
                style={{
                  marginTop: 6,
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: 0,
                  cursor: !canAnalyze || !analysisPrompt.trim() || isAnalyzing ? "not-allowed" : "pointer",
                  color: "inherit",
                  background: "rgba(237,230,221,0.04)",
                  opacity: !canAnalyze || !analysisPrompt.trim() ? 0.35 : 1,
                  transition: "background 0.12s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (canAnalyze && analysisPrompt.trim() && !isAnalyzing) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.04)"; }}
              >
                {isAnalyzing ? "Running…" : "Run custom"}
              </button>
            </div>

            {isAnalyzing && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
                {[0, 150, 300].map((delay) => (
                  <div key={delay} className="rounded-full animate-bounce" style={{ width: 6, height: 6, background: "var(--cz-accent)", animationDelay: `${delay}ms` }} />
                ))}
                <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 4 }}>Analyzing…</span>
              </div>
            )}
          </div>

          {/* Tip box */}
          <div style={{ display: "flex", gap: 10, background: "rgba(237,230,221,0.04)", borderRadius: 10, padding: 12, marginTop: 18 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>New here?</div>
              <div style={{ fontSize: 11.5, opacity: 0.7, lineHeight: 1.5, minHeight: 44 }}>{TIPS[tipIndex]}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {TIPS.map((_, i) => (
                  <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i === tipIndex ? "var(--cz-accent)" : "rgba(237,230,221,0.2)", transition: "background 0.3s" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </RoleContext.Provider>
  );
}
