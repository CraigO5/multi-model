"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatMessage, PromptTemplate } from "@/types/chat";
import { MAX_SYSTEM_PROMPT_CHARS } from "@/lib/models";
import { ANALYSES } from "@/lib/utils";
import { TrashIcon } from "@/components/icons";
import { MODELS } from "@/lib/models";
import { isPaid } from "@/lib/utils";
import { type Icon, Trophy, Checks, FlowArrow, ListBullets, X as PhX, ChartLineUp, SlidersHorizontal, Textbox, CaretDown, Cpu } from "@phosphor-icons/react";

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
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const paid = MODELS.filter((m) => isPaid(m.id));
  const free = MODELS.filter((m) => !isPaid(m.id));

  const renderOption = (m: typeof MODELS[number]) => {
    const limited = isRateLimited(m.id);
    const selected = m.id === analysisModelId;
    return (
      <button
        key={m.id}
        onClick={() => { if (!limited) { setAnalysisModelId(m.id); setOpen(false); } }}
        disabled={limited}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: 0,
          background: selected ? "var(--cz-accent-soft)" : "transparent",
          color: limited ? "rgba(237,230,221,0.25)" : selected ? "var(--cz-accent)" : "rgba(237,230,221,0.82)",
          fontSize: 12.5,
          fontFamily: "inherit",
          cursor: limited ? "not-allowed" : "pointer",
          textAlign: "left",
          textDecoration: limited ? "line-through" : "none",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!limited && !selected) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <img src={m.icon} alt={m.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain", opacity: limited ? 0.3 : 1, flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
        {limited && <span style={{ fontSize: 10, opacity: 0.5 }}>rate limited</span>}
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
            {paid.length > 0 && (
              <>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cz-accent)", opacity: 0.7, padding: "6px 10px 3px" }}>
                  ★ Premium
                </div>
                {paid.map(renderOption)}
              </>
            )}
            {free.length > 0 && (
              <>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.35, padding: "10px 10px 3px" }}>
                  Free
                </div>
                {free.map(renderOption)}
              </>
            )}
          </div>
        )}
      </div>
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
}: Props) {
  const [showContext, setShowContext] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

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
    <>
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
    </>
  );
}
