"use client";

import { useEffect, useRef, useState } from "react";
import type { Chat, ChatMessage, Model } from "@/types/chat";
import { MODELS, MAX_INPUT_CHARS } from "@/lib/models";
import { isPaid, isProModel, formatUsd, formatLatency } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import {
  EyeOffIcon,
  EyeIcon,
  MenuIcon,
  SendAltIcon,
  SparkleIcon,
  SplitIcon,
  StopIcon,
  CopyIcon,
  CheckIcon,
  ContinueIcon,
  FollowUpIcon,
  RegenIcon,
  SliderIcon,
  StarIcon,
} from "@/components/icons";
import { GridFour, Sidebar } from "@phosphor-icons/react";
import { RateLimitMessage } from "@/components/RateLimitMessage";

type Props = {
  activeChat: Chat | null;
  messages: ChatMessage[];
  isLoading: boolean;
  models: Model[];
  addModel: (model: Model) => void;
  removeModel: (model: Model) => void;
  showAllModels: boolean;
  setShowAllModels: (s: boolean) => void;
  isRateLimited: (modelId: string) => boolean;
  rateLimitMinsLeft: (modelId: string) => number;
  totalUsage: { tokens: number; cost: number };
  handleSendMessage: (content: string) => void;
  handleCancel: () => void;
  handleSplit: () => void;
  showAnalysisPanel: boolean;
  setShowAnalysisPanel: (s: boolean) => void;
  unifiedScrollRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  overLimit: boolean;
  blindMode: boolean;
  setBlindMode: (v: boolean) => void;
  streamingContent: Record<string, string>;
  handleRegenerate: (modelId: string, userMsgIdx: number) => void;
  onOpenSidebar: () => void;
  isAnalyzing: boolean;
};

type BlindInfo = {
  letter: string;
  userIdx: number;
  roundIdxs: number[];
};

function ModelIcon({ model, size = 28 }: { model: { icon: string; color: string; name: string; initial: string }; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: model.color + "28",
        border: `1.5px solid ${model.color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img
        src={model.icon}
        alt={model.name}
        style={{ width: size * 0.57, height: size * 0.57, objectFit: "contain", borderRadius: 2 }}
        onError={(e) => {
          // fallback to initial letter if icon fails to load
          const el = e.currentTarget;
          el.style.display = "none";
          const parent = el.parentElement!;
          parent.style.background = model.color;
          parent.textContent = model.initial;
          Object.assign(parent.style, { color: "#fff", fontWeight: "700", fontSize: `${size * 0.43}px` });
        }}
      />
    </div>
  );
}

export function ChatView({
  activeChat,
  messages,
  isLoading,
  models,
  addModel,
  removeModel,
  showAllModels,
  setShowAllModels,
  isRateLimited,
  rateLimitMinsLeft,
  totalUsage,
  handleSendMessage: handleSendMessageProp,
  handleCancel,
  handleSplit,
  showAnalysisPanel,
  setShowAnalysisPanel,
  unifiedScrollRef,
  error,
  overLimit,
  blindMode,
  setBlindMode,
  streamingContent,
  handleRegenerate,
  onOpenSidebar,
  isAnalyzing,
}: Props) {
  const [chosenByRound, setChosenByRound] = useState<Map<number, number>>(new Map());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sideBySide, setSideBySide] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    setUserMessage("");
    handleSendMessageProp(content);
  };

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsPwa(standalone);
    if (standalone) setSideBySide(false);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = (matches: boolean) => {
      setIsMobile(matches);
      if (matches) setSideBySide(false);
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setChosenByRound(new Map());
  }, [activeChat?.id, blindMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const msgBlindInfo = new Map<number, BlindInfo>();
  if (blindMode) {
    const rounds: { userIdx: number; assistantIdxs: number[] }[] = [];
    let cur: { userIdx: number; assistantIdxs: number[] } | null = null;
    messages.forEach((m, i) => {
      if (m.role === "user") {
        if (cur) rounds.push(cur);
        cur = { userIdx: i, assistantIdxs: [] };
      } else if (m.role === "assistant" && !m.synthesis && cur) {
        cur.assistantIdxs.push(i);
      }
    });
    if (cur) rounds.push(cur);
    rounds.forEach((round) => {
      round.assistantIdxs.forEach((idx, pos) => {
        msgBlindInfo.set(idx, {
          letter: String.fromCharCode(65 + pos),
          userIdx: round.userIdx,
          roundIdxs: round.assistantIdxs,
        });
      });
    });
  }

  const pickResponse = (msgIdx: number) => {
    const info = msgBlindInfo.get(msgIdx);
    if (!info) return;
    if (chosenByRound.has(info.userIdx)) return;
    setChosenByRound((prev) => new Map([...prev, [info.userIdx, msgIdx]]));
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };


  const pillBase: React.CSSProperties = {
    background: "transparent",
    border: 0,
    color: "inherit",
    padding: "7px 11px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    opacity: 0.65,
    transition: "background 0.12s, opacity 0.12s",
    whiteSpace: "nowrap" as const,
  };
  const pillOn: React.CSSProperties = {
    ...pillBase,
    background: "var(--cz-accent-soft)",
    color: "var(--cz-accent)",
    opacity: 1,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div
        className="w-full shrink-0 relative px-4 sm:px-8"
        style={{ paddingTop: 16, paddingBottom: 10, touchAction: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="md:hidden shrink-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
            style={{ background: "rgba(237,230,221,0.06)", border: 0, width: 32, height: 32, borderRadius: 10, color: "var(--cz-text)" }}
          >
            <Sidebar size={18} />
          </button>
          <h1 className="truncate flex-1 min-w-0" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {activeChat?.title ?? "New chat"}
          </h1>
          {/* Pills */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => setBlindMode(!blindMode)}
            title={blindMode ? "Exit blind mode" : "Blind mode — hide model names until you pick"}
            style={blindMode ? pillOn : pillBase}
            onMouseEnter={e => { if (!blindMode) { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; (e.currentTarget as HTMLElement).style.opacity = "1"; } }}
            onMouseLeave={e => { if (!blindMode) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.65"; } }}
          >
            {blindMode ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            <span className="hidden sm:inline">Blind mode</span>
          </button>

          <button
            onClick={() => setShowAllModels(!showAllModels)}
            style={showAllModels ? pillOn : pillBase}
            onMouseEnter={e => { if (!showAllModels) { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; (e.currentTarget as HTMLElement).style.opacity = "1"; } }}
            onMouseLeave={e => { if (!showAllModels) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.65"; } }}
          >
            {/* Stacked model icons */}
            <span style={{ display: "flex", alignItems: "center" }}>
              {models.map((model, idx) => (
                <span
                  key={model.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: model.color + "30",
                    border: `1.5px solid ${model.color}55`,
                    marginLeft: idx > 0 ? -5 : 0,
                    zIndex: models.length - idx,
                    position: "relative",
                  }}
                >
                  <img src={model.icon} alt={model.name} style={{ width: 9, height: 9, objectFit: "contain", borderRadius: 1 }} />
                </span>
              ))}
            </span>
            <span className="hidden sm:inline" style={{ fontSize: 12 }}>{models.length} AIs</span>
          </button>

          {messages.length > 0 && models.length > 1 && !blindMode && !isPwa && !isMobile && (
            <button
              onClick={() => setSideBySide(!sideBySide)}
              title={sideBySide ? "Stack responses" : "Show responses side by side"}
              className="flex items-center gap-1.5"
              style={sideBySide ? pillOn : pillBase}
              onMouseEnter={e => { if (!sideBySide) { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; (e.currentTarget as HTMLElement).style.opacity = "1"; } }}
              onMouseLeave={e => { if (!sideBySide) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.65"; } }}
            >
              <GridFour size={14} />
              <span className="hidden lg:inline">Side by side</span>
            </button>
          )}

          {messages.length > 0 && models.length > 1 && !blindMode && !isMobile && (
            <button
              onClick={handleSplit}
              title="Split into separate threads per model"
              className="flex items-center gap-1.5"
              style={pillBase}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.65"; }}
            >
              <SplitIcon size={14} />
              <span className="hidden lg:inline">Split</span>
            </button>
          )}

          <button
            onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
            title="Settings"
            style={showAnalysisPanel ? pillOn : pillBase}
            onMouseEnter={e => { if (!showAnalysisPanel) { (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; (e.currentTarget as HTMLElement).style.opacity = "1"; } }}
            onMouseLeave={e => { if (!showAnalysisPanel) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.65"; } }}
          >
            <SliderIcon size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          </div>
        </div>

        {/* Model selector dropdown — positioned relative to header */}
        {showAllModels && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAllModels(false)} />
            <div
              className="absolute z-20 mt-1 rounded-2xl p-1.5 shadow-2xl w-72 max-h-96 overflow-y-auto animate-panel-in right-4 sm:right-8"
              style={{
                background: "var(--cz-surface)",
                top: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                border: "1px solid rgba(237,230,221,0.06)",
              }}
            >
              {(() => {
                const renderRow = (model: (typeof MODELS)[number]) => {
                  const active = models.some((mm) => mm.id === model.id);
                  const limited = isRateLimited(model.id);
                  const pro = isProModel(model.id);
                  const atCap = models.length >= 3 && !active;
                  const disabled = atCap || limited || pro;
                  return (
                    <button
                      key={model.id}
                      onClick={() => !disabled && (active ? removeModel(model) : addModel(model))}
                      disabled={disabled}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm w-full text-left"
                      style={{
                        color: pro ? "rgba(237,230,221,0.4)" : limited ? "rgba(237,230,221,0.25)" : active ? "var(--cz-accent)" : atCap ? "rgba(237,230,221,0.25)" : "rgba(237,230,221,0.75)",
                        background: active ? "var(--cz-accent-soft)" : "transparent",
                        textDecoration: limited ? "line-through" : "none",
                        cursor: disabled ? "not-allowed" : "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={model.icon}
                          alt={model.name}
                          style={{ width: 16, height: 16, borderRadius: 3, objectFit: "contain", opacity: disabled ? 0.35 : 1, flexShrink: 0 }}
                        />
                        <span className="truncate">{model.name}</span>
                      </div>
                      <span style={{ fontSize: 10, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        {pro ? (
                          <span style={{ background: "rgba(107,207,127,0.12)", border: "1px solid rgba(107,207,127,0.25)", color: "var(--cz-accent)", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, letterSpacing: "0.04em" }}>PRO</span>
                        ) : limited ? (
                          <span style={{ opacity: 0.45 }}>{rateLimitMinsLeft(model.id)}m</span>
                        ) : (
                          <span style={{ opacity: 0.45 }}>{isPaid(model.id) ? `$${model.pricing.prompt}` : "free"}</span>
                        )}
                      </span>
                    </button>
                  );
                };
                const standard = MODELS.filter((m) => !isProModel(m.id));
                const pro = MODELS.filter((m) => isProModel(m.id));
                return (
                  <>
                    {standard.length > 0 && (
                      <>
                        <div style={{ fontSize: 9, textTransform: "uppercase", opacity: 0.35, letterSpacing: "0.1em", padding: "6px 12px 4px" }}>
                          Standard
                        </div>
                        <div className="space-y-0.5">{standard.map(renderRow)}</div>
                      </>
                    )}
                    {pro.length > 0 && (
                      <>
                        <div style={{ fontSize: 9, textTransform: "uppercase", color: "var(--cz-accent)", opacity: 0.7, letterSpacing: "0.1em", padding: "12px 12px 4px" }}>
                          ✦ Pro
                        </div>
                        <div className="space-y-0.5">{pro.map(renderRow)}</div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* ── Messages feed ── */}
      <div ref={unifiedScrollRef} className="flex-1 overflow-y-auto" style={{ display: "flex", flexDirection: "column" }}>
        <div className="px-4 sm:px-8" style={{ paddingTop: 14, paddingBottom: 24, display: "flex", flexDirection: "column", gap: isMobile ? 34 : 22, maxWidth: sideBySide ? "100%" : 760, width: "100%", margin: "0 auto", flex: 1 }}>
          {messages.length === 0 && Object.keys(streamingContent).length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20 }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {models.map((m) => {
                  const meta = MODELS.find((x) => x.id === m.id);
                  if (!meta) return null;
                  return <ModelIcon key={m.id} model={meta as { icon: string; color: string; name: string; initial: string }} size={38} />;
                })}
              </div>
              <p className="text-sm select-none" style={{ opacity: 0.35 }}>
                Ask anything — all {models.length} AI{models.length !== 1 ? "s" : ""} will answer at once.
              </p>
            </div>
          )}

          {(() => {
            const renderMessageCard = (message: ChatMessage, i: number, compact?: boolean) => {
              const meta = message.model ? MODELS.find((m) => m.id === message.model) : null;
              const isBlindTarget = blindMode && message.role === "assistant" && !message.synthesis && !!message.model;
              const blindInfo = isBlindTarget ? msgBlindInfo.get(i) : undefined;
              const roundChosenIdx = blindInfo ? chosenByRound.get(blindInfo.userIdx) : undefined;
              const roundRevealed = roundChosenIdx !== undefined;
              const isChosen = roundChosenIdx === i;
              const canPick = isBlindTarget && !roundRevealed;
              const isNormalAssistant = message.role === "assistant" && !message.synthesis && !blindMode && !!message.model;

              const findUserMsgIdx = () => {
                for (let j = i - 1; j >= 0; j--) {
                  if (messages[j].role === "user") return j;
                }
                return -1;
              };

              if (!message.model) {
                return (
                  <div key={i} className="flex flex-col items-end animate-msg-in">
                    <div style={{ background: "rgba(237,230,221,0.08)", padding: "11px 17px", borderRadius: 18, fontSize: 14.5, maxWidth: sideBySide ? "100%" : "70%", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`flex flex-col items-start ${canPick ? "cursor-pointer" : ""}`}
                  onClick={canPick ? () => pickResponse(i) : undefined}
                >
                  <div className="group w-full" style={{ display: "flex", gap: compact ? 4 : 13, flexDirection: compact ? "column" : "row", alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{ flexShrink: 0, paddingTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                      {message.synthesis ? (
                        <div style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)", border: "1.5px solid rgba(237,230,221,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <SparkleIcon size={compact ? 10 : 13} style={{ color: "var(--cz-accent)" }} />
                        </div>
                      ) : canPick ? (
                        <div style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 9 : 11, fontWeight: 700, color: "rgba(165,180,252,0.85)" }}>
                          {blindInfo?.letter}
                        </div>
                      ) : meta ? (
                        <ModelIcon model={meta} size={compact ? 22 : 28} />
                      ) : (
                        <div style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)" }} />
                      )}
                      {compact && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ color: message.synthesis ? "var(--cz-accent)" : "inherit" }}>
                            {message.synthesis ? "Synthesis" : canPick ? `Response ${blindInfo?.letter}` : meta?.name}
                          </span>
                          {!canPick && message.usage && (
                            <span style={{ opacity: 0.4, fontWeight: 400 }}>
                              · {formatUsd(message.usage.cost)}
                              {message.usage.latencyMs !== undefined && ` · ${formatLatency(message.usage.latencyMs)}`}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Header row */}
                      {!compact && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                          {message.synthesis ? (
                            <>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cz-accent)" }}>Synthesis</span>
                              {meta && <span style={{ fontSize: 11.5, opacity: 0.4 }}>· via {meta.name}</span>}
                              {message.usage && <span style={{ fontSize: 11.5, opacity: 0.4 }}>· {formatUsd(message.usage.cost)}{message.usage.latencyMs !== undefined && ` · ${formatLatency(message.usage.latencyMs)}`}</span>}
                            </>
                          ) : canPick ? (
                            <span style={{ fontSize: 12.5, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>
                              Response {blindInfo?.letter}
                            </span>
                          ) : isBlindTarget && roundRevealed ? (
                            <>
                              {meta && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{meta.name}</span>}
                              {isChosen && <span style={{ fontSize: 11.5, color: "var(--cz-accent)", display: "flex", alignItems: "center", gap: 3 }}><StarIcon size={10} weight="fill" /> your pick</span>}
                              {message.usage && <span style={{ fontSize: 11.5, opacity: 0.4 }}>· {formatUsd(message.usage.cost)}{message.usage.latencyMs !== undefined && ` · ${formatLatency(message.usage.latencyMs)}`}</span>}
                            </>
                          ) : (
                            <>
                              {meta && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{meta.name}</span>}
                              {message.usage && (
                                <span style={{ fontSize: 11.5, opacity: 0.4 }}>
                                  · {formatUsd(message.usage.cost)}
                                  {message.usage.latencyMs !== undefined && ` · ${formatLatency(message.usage.latencyMs)}`}
                                  {` · ${(message.usage.promptTokens + message.usage.completionTokens).toLocaleString()} tok`}
                                </span>
                              )}
                              {isNormalAssistant && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(message.content, i); }}
                                    title="Copy"
                                    className="cursor-pointer flex items-center gap-1 transition-all"
                                    style={{ fontSize: 11.5, opacity: 0.55, background: "transparent", border: 0, color: "inherit", padding: "3px 7px", borderRadius: 6 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                  >
                                    {copiedIdx === i ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                                    {copiedIdx === i ? "Copied" : "Copy"}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const userIdx = findUserMsgIdx();
                                      if (userIdx !== -1 && message.model) handleRegenerate(message.model, userIdx);
                                    }}
                                    title="Regenerate"
                                    className="cursor-pointer flex items-center gap-1 transition-all"
                                    style={{ fontSize: 11.5, opacity: 0.55, background: "transparent", border: 0, color: "inherit", padding: "3px 7px", borderRadius: 6 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                  >
                                    <RegenIcon size={12} />
                                    Regen
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Body */}
                      <div style={{ fontSize: compact ? 13 : 14.5, lineHeight: 1.65, opacity: 0.9 }}>
                        {message.content === "⚠ rate_limit_free" ? (
                          <RateLimitMessage free={true} />
                        ) : message.content === "⚠ rate_limit_paid" ? (
                          <RateLimitMessage free={false} />
                        ) : message.content.startsWith("⚠") ? (
                          <p style={{ color: "#f87171", whiteSpace: "pre-wrap" }}>{message.content}</p>
                        ) : (
                          <Markdown content={message.content} />
                        )}
                      </div>

                      {/* Per-card footer — hover only */}
                      {isNormalAssistant && !compact && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: "flex", gap: 4, marginTop: 10 }}>
                          {[
                            { icon: <ContinueIcon size={12} />, label: "Continue with this" },
                            { icon: <FollowUpIcon size={12} />, label: "Ask follow-up", action: () => inputRef.current?.focus() },
                          ].map(({ icon, label, action }) => (
                            <button
                              key={label}
                              onClick={(e) => { e.stopPropagation(); action?.(); }}
                              className="cursor-pointer flex items-center gap-1.5 transition-all"
                              style={{ background: "transparent", border: 0, color: "inherit", fontSize: 12, padding: "4px 9px", borderRadius: 6, opacity: 0.55 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.06)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            if (sideBySide && !blindMode) {
              // Group into rounds: user msg → assistant responses (side by side) → synthesis
              const elements: React.ReactNode[] = [];
              let i = 0;
              while (i < messages.length) {
                const msg = messages[i];
                if (msg.role === "user") {
                  elements.push(
                    <div key={`user-${i}`} className="flex flex-col items-center animate-msg-in">
                      <div style={{ background: "rgba(237,230,221,0.08)", padding: "11px 17px", borderRadius: 18, fontSize: 14.5, lineHeight: 1.65, whiteSpace: "pre-wrap", maxWidth: 760 }}>
                        {msg.content}
                      </div>
                    </div>
                  );
                  i++;
                  // Collect consecutive assistant responses
                  const assistants: { msg: ChatMessage; idx: number }[] = [];
                  while (i < messages.length && messages[i].role === "assistant" && !messages[i].synthesis) {
                    assistants.push({ msg: messages[i], idx: i });
                    i++;
                  }
                  if (assistants.length > 0) {
                    const n = assistants.length;
                    elements.push(
                      <div key={`round-${assistants[0].idx}`}>
                        {/* Node lines from user bubble to each column */}
                        <div style={{ display: "flex", justifyContent: "center", height: 40, position: "relative" }}>
                          <svg viewBox="0 0 100 40" width="100%" height="40" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
                            {Array.from({ length: n }).map((_, ci) => {
                              const endX = ((ci + 0.5) / n) * 100;
                              return (
                                <path
                                  key={ci}
                                  d={`M 50 0 C 50 22, ${endX} 18, ${endX} 40`}
                                  stroke="rgba(237,230,221,0.12)"
                                  strokeWidth="0.8"
                                  fill="none"
                                  vectorEffect="non-scaling-stroke"
                                />
                              );
                            })}
                          </svg>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 24 }}>
                          {assistants.map(({ msg: aMsg, idx }) => (
                            <div key={idx} style={{ minWidth: 0, overflow: "hidden" }}>
                              {renderMessageCard(aMsg, idx, true)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } else {
                  // Synthesis or stray assistant
                  elements.push(
                    <div key={`msg-${i}`} style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
                      {renderMessageCard(msg, i)}
                    </div>
                  );
                  i++;
                }
              }
              return elements;
            }

            // Default stacked rendering
            return messages.map((message, i) => renderMessageCard(message, i, isMobile));
          })()}

          {/* Per-model waiting + streaming indicators */}
          {(() => {
            if (!isLoading && Object.keys(streamingContent).length === 0) return null;
            // Models that have already appended a final message this round
            const lastUserIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "user") return i; } return -1; })();
            const respondedIds = new Set(messages.slice(lastUserIdx + 1).filter((m) => m.role === "assistant" && m.model && !m.synthesis).map((m) => m.model!));

            return (
              <>
                {/* Waiting — model queued but hasn't started streaming */}
                {isLoading && models.filter((m) => !(m.id in streamingContent) && !respondedIds.has(m.id)).map((model) => {
                  const meta = MODELS.find((m) => m.id === model.id);
                  return (
                    <div key={`wait-${model.id}`} className="animate-msg-in" style={{ display: "flex", gap: isMobile ? 4 : 13, flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, paddingTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                        {meta ? <ModelIcon model={meta} size={isMobile ? 22 : 28} /> : <div style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)" }} />}
                        {isMobile && meta && <span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.5 }}>{meta.name}</span>}
                        {isMobile && (
                          <span style={{ display: "flex", gap: 3, marginLeft: 2 }}>
                            {[0, 1, 2].map((j) => (
                              <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "rgba(237,230,221,0.25)", animationDelay: `${j * 150}ms` }} />
                            ))}
                          </span>
                        )}
                      </div>
                      {!isMobile && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                            {meta && <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.5 }}>{meta.name}</span>}
                            <span style={{ display: "flex", gap: 3 }}>
                              {[0, 1, 2].map((j) => (
                                <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "rgba(237,230,221,0.25)", animationDelay: `${j * 150}ms` }} />
                              ))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming — content arriving */}
                {Object.entries(streamingContent).map(([modelId, content]) => {
                  const meta = MODELS.find((m) => m.id === modelId);
                  return (
                    <div key={`stream-${modelId}`} className="animate-msg-in" style={{ display: "flex", gap: isMobile ? 4 : 13, flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, paddingTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                        {meta ? <ModelIcon model={meta} size={isMobile ? 22 : 28} /> : <div style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)" }} />}
                        {isMobile && (
                          <>
                            {meta && <span style={{ fontSize: 11.5, fontWeight: 600 }}>{meta.name}</span>}
                            <span style={{ display: "flex", gap: 3, marginLeft: 2 }}>
                              {[0, 1, 2].map((j) => (
                                <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "rgba(237,230,221,0.3)", animationDelay: `${j * 150}ms` }} />
                              ))}
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : undefined }}>
                        {!isMobile && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                            {meta && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{meta.name}</span>}
                            <span style={{ display: "flex", gap: 3 }}>
                              {[0, 1, 2].map((j) => (
                                <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "rgba(237,230,221,0.3)", animationDelay: `${j * 150}ms` }} />
                              ))}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: isMobile ? 13 : 14.5, lineHeight: 1.65, opacity: 0.9 }}>
                          <Markdown content={content} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* Analysis loading indicator */}
          {isAnalyzing && (
            <div className="animate-msg-in" style={{ display: "flex", gap: 13 }}>
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)", border: "1.5px solid rgba(237,230,221,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SparkleIcon size={13} style={{ color: "var(--cz-accent)" }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cz-accent)", opacity: 0.7 }}>Analyzing…</span>
                  <span style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map((j) => (
                      <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "var(--cz-accent)", opacity: 0.4, animationDelay: `${j * 150}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Composer ── */}
      <div className="px-4 sm:px-8" style={{ paddingTop: 8, paddingBottom: "max(22px, env(safe-area-inset-bottom))", maxWidth: 760, width: "100%", margin: "0 auto", alignSelf: "center", boxSizing: "border-box", touchAction: "none" }}>
        {error && (
          <div style={{ marginBottom: 8, fontSize: 13, color: "#f87171", background: "rgba(239,68,68,0.1)", borderRadius: 10, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {error}
          </div>
        )}

        <div
          className="focus-within:ring-0"
          style={{
            background: "rgba(237,230,221,0.05)",
            borderRadius: 14,
            padding: "12px 14px 8px",
            transition: "background 0.12s",
            opacity: isLoading || overLimit ? 0.65 : 1,
            border: "1px solid rgba(237,230,221,0.06)",
          }}
          onFocus={e => { if (e.currentTarget.contains(e.target)) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; }}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.05)"; }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={overLimit ? "Limit reached" : "Ask anything…"}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value.slice(0, MAX_INPUT_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage(userMessage);
              if (e.key === "Escape") setShowAllModels(false);
            }}
            disabled={isLoading || overLimit}
            style={{ width: "100%", background: "transparent", border: 0, outline: "none", fontSize: 14.5, color: "var(--cz-text)", padding: "4px 0 8px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => removeModel(model)}
                title={`Remove ${model.name}`}
                style={{ fontSize: 11, padding: "3px 8px 3px 6px", background: "rgba(237,230,221,0.06)", borderRadius: 999, border: 0, color: "inherit", opacity: 0.75, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "opacity 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.75")}
              >
                <img src={model.icon} alt={model.name} style={{ width: 12, height: 12, borderRadius: 2, objectFit: "contain" }} />
                {model.name.split(" ")[0]}
              </button>
            ))}
            <div style={{ marginLeft: "auto" }}>
              {isLoading ? (
                <button
                  onClick={handleCancel}
                  title="Cancel"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(237,230,221,0.08)", border: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7, transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget.style.opacity = "1"); (e.currentTarget.style.background = "rgba(239,68,68,0.15)"); (e.currentTarget.style.color = "#f87171"); }}
                  onMouseLeave={e => { (e.currentTarget.style.opacity = "0.7"); (e.currentTarget.style.background = "rgba(237,230,221,0.08)"); (e.currentTarget.style.color = "inherit"); }}
                >
                  <StopIcon size={12} weight="fill" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage(userMessage)}
                  disabled={overLimit}
                  title="Send (Enter)"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "var(--cz-accent)", border: 0, color: "#0a0a0d", cursor: overLimit ? "not-allowed" : "pointer", opacity: overLimit ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.12s" }}
                >
                  <SendAltIcon size={13} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>

        {userMessage.length > MAX_INPUT_CHARS * 0.8 && (
          <p style={{ fontSize: 10, textAlign: "right", marginTop: 4, fontVariantNumeric: "tabular-nums", color: userMessage.length >= MAX_INPUT_CHARS ? "#f87171" : "rgba(237,230,221,0.3)" }}>
            {userMessage.length}/{MAX_INPUT_CHARS}
          </p>
        )}
        <p className="hidden sm:block" style={{ fontSize: 11.5, opacity: 0.35, marginTop: 8, paddingLeft: 2 }}>
          Press Enter — all AIs answer at once
        </p>
      </div>
    </div>
  );
}
