"use client";

import { useState, useEffect } from "react";
import type { ChatMessage, PromptTemplate } from "@/types/chat";
import { MODELS, MAX_SYSTEM_PROMPT_CHARS } from "@/lib/models";
import { ANALYSES, isPaid, formatUsd } from "@/lib/utils";
import { TrashIcon } from "@/components/icons";
import { type Icon, Scales, Warning, Checks, FlowArrow, X as PhX, ChartLineUp, SlidersHorizontal, Textbox, Gear, Cpu, CaretDown } from "@phosphor-icons/react";

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
  handleAnalysis: (preset: keyof typeof ANALYSES | "custom", customText?: string) => void;
  view: "chat" | "analytics";
  setView: (v: "chat" | "analytics") => void;
  temperature: number;
  setTemperature: (t: number) => void;
  systemPrompt: string;
  setSystemPrompt: (p: string) => void;
  showTemplates: boolean;
  setShowTemplates: (s: boolean) => void;
  templates: PromptTemplate[];
  saveTemplate: () => void;
  loadTemplate: (t: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
};

// Cozy action definitions mapped to existing analysis presets
const COZY_ACTIONS: { key: "synthesize" | "compare" | "critique" | "factcheck"; Icon: Icon; label: string; sub: string; emoji: string; primary?: boolean }[] = [
  { key: "synthesize", Icon: FlowArrow, label: "Combine answers", sub: "Get one best answer", emoji: "✨", primary: true },
  { key: "compare", Icon: Scales, label: "Compare", sub: "Where they agree & disagree", emoji: "⚖️" },
  { key: "critique", Icon: Warning, label: "Find weak spots", sub: "What might be wrong", emoji: "⚠️" },
  { key: "factcheck", Icon: Checks, label: "Fact-check", sub: "Verify the claims", emoji: "✓" },
];

const TIPS = [
  "Try asking the same thing you'd Google. Three perspectives often beats one.",
  "Use Blind mode to pick your favorite answer without bias.",
  "Split view lets you dive deeper into one model's reasoning.",
  "Ask follow-ups to get better answers. Each model thinks differently.",
  "Combine answers to get the best of all three models.",
  "Check facts across models to spot disagreements.",
];

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
  handleAnalysis,
  view,
  setView,
  temperature,
  setTemperature,
  systemPrompt,
  setSystemPrompt,
  showTemplates,
  setShowTemplates,
  templates,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
}: Props) {
  const [advanced, setAdvanced] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000); // Change tip every 8 seconds
    return () => clearInterval(timer);
  }, []);

  // Map temperature (0–2) to creativity (0–100) and back
  const creativity = Math.round((temperature / 2) * 100);
  const setCreativity = (val: number) => setTemperature(parseFloat(((val / 100) * 2).toFixed(2)));

  const creativityLabel =
    creativity < 33 ? "Focused" : creativity < 67 ? "Balanced" : "Playful";

  return (
    <aside
      className="
        fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto
        md:relative md:inset-auto md:max-h-none md:overflow-y-auto
        md:w-[296px] md:shrink-0
        border-t border-white/5 md:border-t-0 md:border-l md:border-white/5
        flex flex-col animate-panel-in
      "
      style={{ background: "var(--cz-surface)" }}
    >

      {/* Mobile drag handle */}
      <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
        <div style={{ width: 32, height: 4, background: "rgba(237,230,221,0.12)", borderRadius: 2 }} />
      </div>

      {/* Header */}
      <div style={{ padding: "22px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SlidersHorizontal size={15} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Settings</span>
        </div>
        <button
          onClick={() => setShowAnalysisPanel(false)}
          style={{ background: "transparent", border: 0, color: "inherit", opacity: 0.4, cursor: "pointer", padding: "5px", borderRadius: 6, display: "flex", alignItems: "center" }}
          onMouseEnter={e => { (e.currentTarget.style.opacity = "1"); (e.currentTarget.style.background = "rgba(237,230,221,0.06)"); }}
          onMouseLeave={e => { (e.currentTarget.style.opacity = "0.4"); (e.currentTarget.style.background = "transparent"); }}
        >
          <PhX size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px", display: "flex", flexDirection: "column", gap: 0 }}>

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
          onMouseEnter={e => { if (view !== "analytics") { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; } }}
          onMouseLeave={e => { if (view !== "analytics") { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.04)"; } }}
        >
          <ChartLineUp size={15} />
          <span style={{ color: view === "analytics" ? "var(--cz-accent)" : "inherit" }}>Analytics</span>
        </button>
        </div>

        {/* Creativity slider */}
        <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 10, opacity: 0.85 }}>
            How creative should answers be?
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={creativity}
            onChange={(e) => setCreativity(+e.target.value)}
            style={{
              width: "100%",
              WebkitAppearance: "none",
              appearance: "none",
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(to right, var(--cz-accent) ${creativity}%, rgba(237,230,221,0.12) ${creativity}%)`,
              outline: 0,
              cursor: "pointer",
              accentColor: "var(--cz-accent)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.5, marginTop: 8 }}>
            <span>Focused</span>
            <span style={{ fontWeight: creativityLabel === "Balanced" ? 600 : 400, opacity: creativityLabel === "Balanced" ? 0.8 : 0.5 }}>Balanced</span>
            <span>Playful</span>
          </div>
        </div>
        </div>

        {/* Context / system prompt */}
        <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
          <button
            onClick={() => setShowContext(!showContext)}
            style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12.5, fontWeight: 500, cursor: "pointer", opacity: 0.65, padding: 0, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "opacity 0.12s" }}
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
        </div>

        {/* Advanced — collapsible */}
        <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: "1px solid rgba(237,230,221,0.06)" }}>
          <button
            onClick={() => setAdvanced(!advanced)}
            style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12.5, cursor: "pointer", opacity: 0.65, padding: 0, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", transition: "opacity 0.12s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}
          >
            <Gear size={14} />
            Advanced
            <CaretDown size={13} style={{ marginLeft: "auto", transition: "transform 0.2s", transform: advanced ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>
          {advanced && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }} className="animate-expand-in">
              {/* Model picker for analysis */}
              <div>
                <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  <Cpu size={13} />
                  Analysis model
                </div>
                <select
                  value={analysisModelId}
                  onChange={(e) => setAnalysisModelId(e.target.value)}
                  disabled={isAnalyzing}
                  style={{
                    background: "rgba(237,230,221,0.05)",
                    border: 0,
                    color: "var(--cz-text)",
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    outline: 0,
                    width: "100%",
                    cursor: "pointer",
                  }}
                >
                  <optgroup label="★ Premium">
                    {MODELS.filter((m) => isPaid(m.id)).map((m) => (
                      <option key={m.id} value={m.id} disabled={isRateLimited(m.id)}>
                        {m.name}{isRateLimited(m.id) ? " (rate limited)" : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Free">
                    {MODELS.filter((m) => !isPaid(m.id)).map((m) => (
                      <option key={m.id} value={m.id} disabled={isRateLimited(m.id)}>
                        {m.name}{isRateLimited(m.id) ? " (rate limited)" : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {(() => {
                  const m = MODELS.find((x) => x.id === analysisModelId);
                  if (!m || !isPaid(m.id)) return null;
                  return (
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                      {formatUsd(m.pricing.prompt)} in · {formatUsd(m.pricing.completion)} out / 1M · About 3¢ per use
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        </div>

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
                    onMouseEnter={e => {
                      if (!disabled) {
                        (e.currentTarget as HTMLElement).style.background = a.primary
                          ? "rgba(168,181,160,0.2)"
                          : "rgba(237,230,221,0.08)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!disabled) {
                        (e.currentTarget as HTMLElement).style.background = a.primary
                          ? "var(--cz-accent-soft)"
                          : "rgba(237,230,221,0.04)";
                      }
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{a.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: a.primary ? "var(--cz-accent)" : "inherit" }}>
                        {a.label}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{a.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom analysis */}
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
                <div
                  key={delay}
                  className="rounded-full animate-bounce"
                  style={{ width: 6, height: 6, background: "var(--cz-accent)", animationDelay: `${delay}ms` }}
                />
              ))}
              <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 4 }}>Analyzing…</span>
            </div>
          )}
        </div>
        </div>

        {/* Tip box */}
        <div
          style={{
            display: "flex",
            gap: 10,
            background: "rgba(237,230,221,0.04)",
            borderRadius: 10,
            padding: 12,
            marginTop: "auto",
          }}
        >
          <span style={{ fontSize: 18 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>New here?</div>
            <div style={{ fontSize: 11.5, opacity: 0.7, lineHeight: 1.5, minHeight: 44 }}>
              {TIPS[tipIndex]}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {TIPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: i === tipIndex ? "var(--cz-accent)" : "rgba(237,230,221,0.2)",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
