"use client";

import { useEffect, useRef, useState } from "react";
import type { Chat, ChatMessage, Model } from "@/types/chat";
import { MODELS, MAX_INPUT_CHARS } from "@/lib/models";
import { isPaid, formatUsd, formatLatency } from "@/lib/utils";
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
  userMessage: string;
  setUserMessage: (m: string) => void;
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
  userMessage,
  setUserMessage,
  handleSendMessage,
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
}: Props) {
  const [chosenByRound, setChosenByRound] = useState<Map<number, number>>(new Map());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const isFirstAssistantInRound = (i: number): boolean => {
    const msg = messages[i];
    if (msg.role !== "assistant" || msg.synthesis) return false;
    const prev = messages[i - 1];
    return !prev || prev.role === "user" || !!prev.synthesis;
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
        className="w-full shrink-0 relative"
        style={{ padding: "20px 32px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="md:hidden cursor-pointer shrink-0"
            style={{ ...pillBase, padding: "6px", opacity: 0.7 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            title="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {activeChat?.title ?? "New chat"}
            </h1>
            {blindMode ? (
              <p style={{ fontSize: 12.5, marginTop: 4, color: "var(--cz-accent)" }}>
                Blind mode — click to pick your favourite
              </p>
            ) : totalUsage.tokens > 0 ? (
              <p style={{ fontSize: 12.5, marginTop: 4, opacity: 0.45 }}>
                {models.length} AI{models.length !== 1 ? "s" : ""} answered · {formatUsd(totalUsage.cost)} total
              </p>
            ) : null}
          </div>
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: 12 }}>
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
            <span style={{ fontSize: 12 }}>{models.length} AIs</span>
          </button>

          {messages.length > 0 && models.length > 1 && !blindMode && (
            <button
              onClick={handleSplit}
              title="Split into separate threads per model"
              className="hidden md:flex items-center gap-1.5"
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

        {/* Model selector dropdown — positioned relative to header */}
        {showAllModels && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAllModels(false)} />
            <div
              className="absolute z-20 mt-1 rounded-2xl p-1.5 shadow-2xl w-72 max-h-96 overflow-y-auto animate-panel-in"
              style={{
                background: "var(--cz-surface)",
                top: "100%",
                right: 32,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                border: "1px solid rgba(237,230,221,0.06)",
              }}
            >
              {(() => {
                const paid = MODELS.filter((m) => isPaid(m.id));
                const free = MODELS.filter((m) => !isPaid(m.id));
                const renderRow = (model: (typeof MODELS)[number]) => {
                  const active = models.some((mm) => mm.id === model.id);
                  const limited = isRateLimited(model.id);
                  const atCap = models.length >= 3 && !active;
                  const paidModel = isPaid(model.id);
                  const disabled = atCap || limited;
                  return (
                    <button
                      key={model.id}
                      onClick={() => !disabled && (active ? removeModel(model) : addModel(model))}
                      disabled={disabled}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm w-full text-left"
                      style={{
                        color: limited ? "rgba(237,230,221,0.25)" : active ? "var(--cz-accent)" : atCap ? "rgba(237,230,221,0.25)" : "rgba(237,230,221,0.75)",
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
                          style={{ width: 16, height: 16, borderRadius: 3, objectFit: "contain", opacity: disabled ? 0.3 : 1, flexShrink: 0 }}
                        />
                        {paidModel && !limited && (
                          <StarIcon size={9} style={{ color: "var(--cz-accent)", flexShrink: 0 }} weight="fill" />
                        )}
                        <span className="truncate">{model.name}</span>
                      </div>
                      <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>
                        {limited ? `${rateLimitMinsLeft(model.id)}m` : paidModel ? `$${model.pricing.prompt}/$${model.pricing.completion}` : "free"}
                      </span>
                    </button>
                  );
                };
                return (
                  <>
                    {paid.length > 0 && (
                      <>
                        <div style={{ fontSize: 9, textTransform: "uppercase", color: "var(--cz-accent)", opacity: 0.7, letterSpacing: "0.1em", padding: "6px 12px 4px" }}>
                          ★ Premium
                        </div>
                        <div className="space-y-0.5">{paid.map(renderRow)}</div>
                      </>
                    )}
                    {free.length > 0 && (
                      <>
                        <div style={{ fontSize: 9, textTransform: "uppercase", opacity: 0.35, letterSpacing: "0.1em", padding: "12px 12px 4px" }}>
                          Free
                        </div>
                        <div className="space-y-0.5">{free.map(renderRow)}</div>
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
      <div ref={unifiedScrollRef} className="flex-1 overflow-y-auto">
        <div style={{ padding: "14px 32px 24px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 760, width: "100%", margin: "0 auto" }}>
          {messages.length === 0 && Object.keys(streamingContent).length === 0 && (
            <p className="text-sm mt-20 select-none text-center" style={{ opacity: 0.3 }}>
              Ask anything — all {models.length} AI{models.length !== 1 ? "s" : ""} will answer at once.
            </p>
          )}

          {messages.map((message, i) => {
            const meta = message.model ? MODELS.find((m) => m.id === message.model) : null;

            const isBlindTarget = blindMode && message.role === "assistant" && !message.synthesis && !!message.model;
            const blindInfo = isBlindTarget ? msgBlindInfo.get(i) : undefined;
            const roundChosenIdx = blindInfo ? chosenByRound.get(blindInfo.userIdx) : undefined;
            const roundRevealed = roundChosenIdx !== undefined;
            const isChosen = roundChosenIdx === i;
            const canPick = isBlindTarget && !roundRevealed;

            const findUserMsgIdx = () => {
              for (let j = i - 1; j >= 0; j--) {
                if (messages[j].role === "user") return j;
              }
              return -1;
            };

            const isNormalAssistant = message.role === "assistant" && !message.synthesis && !blindMode && !!message.model;
            const showGroupDivider = isFirstAssistantInRound(i);

            return (
              <div key={i}>
                {showGroupDivider && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(237,230,221,0.06)" }} />
                    <div style={{ fontSize: 10.5, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {models.length === 1 ? "One answer" : models.length === 2 ? "Two answers" : "Three answers"}
                    </div>
                    <div style={{ flex: 1, height: 1, background: "rgba(237,230,221,0.06)" }} />
                  </div>
                )}

                <div
                  className={`flex flex-col animate-msg-in ${message.model ? "items-start" : "items-end"} ${canPick ? "cursor-pointer" : ""}`}
                  onClick={canPick ? () => pickResponse(i) : undefined}
                >
                  {!message.model ? (
                    <div
                      style={{
                        background: "rgba(237,230,221,0.08)",
                        padding: "11px 17px",
                        borderRadius: 18,
                        fontSize: 14.5,
                        maxWidth: "70%",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.content}
                    </div>
                  ) : (
                    <div className="group w-full" style={{ display: "flex", gap: 13 }}>
                      {/* Avatar */}
                      <div style={{ flexShrink: 0, paddingTop: 2 }}>
                        {message.synthesis ? (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)", border: "1.5px solid rgba(237,230,221,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <SparkleIcon size={13} style={{ color: "var(--cz-accent)" }} />
                          </div>
                        ) : canPick ? (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "rgba(165,180,252,0.85)" }}>
                            {blindInfo?.letter}
                          </div>
                        ) : meta ? (
                          <ModelIcon model={meta} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)" }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header row */}
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

                        {/* Body */}
                        <div style={{ fontSize: 14.5, lineHeight: 1.65, opacity: 0.9 }}>
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
                        {isNormalAssistant && (
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
                  )}
                </div>
              </div>
            );
          })}

          {/* Streaming */}
          {Object.entries(streamingContent).map(([modelId, content]) => {
            if (!content) return null;
            const meta = MODELS.find((m) => m.id === modelId);
            return (
              <div key={`stream-${modelId}`} className="animate-msg-in" style={{ display: "flex", gap: 13 }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  {meta ? <ModelIcon model={meta} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(237,230,221,0.08)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    {meta && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{meta.name}</span>}
                    <span style={{ display: "flex", gap: 3 }}>
                      {[0, 1, 2].map((j) => (
                        <span key={j} className="inline-block rounded-full animate-bounce" style={{ width: 4, height: 4, background: "rgba(237,230,221,0.3)", animationDelay: `${j * 150}ms` }} />
                      ))}
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.65, opacity: 0.9 }}>
                    <Markdown content={content} />
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && Object.keys(streamingContent).length === 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 41px" }}>
              {[0, 150, 300].map((delay) => (
                <div key={delay} className="rounded-full animate-bounce" style={{ width: 6, height: 6, background: "rgba(237,230,221,0.25)", animationDelay: `${delay}ms` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Composer ── */}
      <div style={{ padding: "8px 32px 22px", maxWidth: 760, width: "100%", margin: "0 auto", alignSelf: "center", boxSizing: "border-box" }}>
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
            placeholder={overLimit ? "Daily limit reached" : "Ask anything…"}
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
        <p style={{ fontSize: 11.5, opacity: 0.35, marginTop: 8, paddingLeft: 2 }}>
          Press Enter — all AIs answer at once
        </p>
      </div>
    </div>
  );
}
