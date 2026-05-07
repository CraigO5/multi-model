"use client";

import { useEffect, useRef, useState } from "react";
import type { Chat, ChatMessage, Model } from "@/types/chat";
import { MODELS, MAX_INPUT_CHARS } from "@/lib/models";
import { isPaid, formatUsd, formatLatency } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import {
  ClipboardIcon,
  CheckIcon,
  EyeOffIcon,
  MenuIcon,
  SendIcon,
  SplitIcon,
  SparkleIcon,
  StopIcon,
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

// Per-message blind metadata
type BlindInfo = {
  letter: string;        // A / B / C
  userIdx: number;       // index of the user message that started this round
  roundIdxs: number[];   // all assistant message indices in this round
};

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
  // userIdx → index of the chosen assistant message for that round
  const [chosenByRound, setChosenByRound] = useState<Map<number, number>>(new Map());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when switching chats or toggling blind mode
  useEffect(() => {
    setChosenByRound(new Map());
  }, [activeChat?.id, blindMode]);

  // Cmd+K / Ctrl+K to focus input
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

  // Build blind metadata for every assistant message in two passes
  const msgBlindInfo = new Map<number, BlindInfo>();
  if (blindMode) {
    // Pass 1: group indices into rounds
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

    // Pass 2: assign per-message info
    rounds.forEach((round) => {
      round.assistantIdxs.forEach((idx, pos) => {
        msgBlindInfo.set(idx, {
          letter: String.fromCharCode(65 + pos), // A, B, C...
          userIdx: round.userIdx,
          roundIdxs: round.assistantIdxs,
        });
      });
    });
  }

  const pickResponse = (msgIdx: number) => {
    const info = msgBlindInfo.get(msgIdx);
    if (!info) return;
    if (chosenByRound.has(info.userIdx)) return; // already picked this round
    setChosenByRound((prev) => new Map([...prev, [info.userIdx, msgIdx]]));
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Full-width header ── */}
      <div className="w-full px-6 pt-6 pb-5 flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenSidebar}
            className="md:hidden text-zinc-500 hover:text-zinc-200 cursor-pointer shrink-0"
            title="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100 truncate">
              {activeChat?.title ?? "New chat"}
            </h1>
            {blindMode ? (
              <p className="text-xs text-indigo-400 mt-1">Blind mode — click to pick</p>
            ) : totalUsage.tokens > 0 ? (
              <p className="text-xs text-zinc-600 mt-1 font-mono">
                {totalUsage.tokens.toLocaleString()} tokens · {formatUsd(totalUsage.cost)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={() => setBlindMode(!blindMode)}
            title={blindMode ? "Exit blind mode" : "Enter blind mode"}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition-all duration-150 cursor-pointer text-xs ${
              blindMode
                ? "bg-indigo-950/50 text-indigo-300"
                : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <EyeOffIcon />
            <span className="hidden sm:inline">{blindMode ? "Blind on" : "Blind"}</span>
          </button>
          <button
            onClick={() => setShowAllModels(!showAllModels)}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-zinc-800/70 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
          >
            Models
            <span className="text-zinc-600 ml-0.5">({models.length}/3)</span>
            <span className="text-xs text-zinc-700 ml-0.5">{showAllModels ? "▴" : "▾"}</span>
          </button>
          {/* Studio toggle — mobile only since it's always shown on desktop */}
          <button
            onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
            title="Toggle Studio"
            className={`md:hidden flex items-center gap-1 px-3 py-2 rounded-full transition-all duration-150 cursor-pointer text-xs ${
              showAnalysisPanel
                ? "bg-zinc-800/70 text-amber-400"
                : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <SparkleIcon />
          </button>
          {/* Studio toggle for desktop (when hidden) */}
          {!showAnalysisPanel && (
            <button
              onClick={() => setShowAnalysisPanel(true)}
              title="Open Studio"
              className="hidden md:flex items-center gap-1 px-3 py-2 rounded-full bg-zinc-800/70 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
            >
              <SparkleIcon />
              <span>Studio</span>
            </button>
          )}
          {messages.length > 0 && models.length > 1 && !blindMode && (
            <button
              onClick={handleSplit}
              title="Split into separate chats"
              className="hidden md:flex items-center gap-1 px-3 py-2 rounded-full bg-zinc-800/70 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
            >
              <SplitIcon />
              Split
            </button>
          )}
        </div>

        {showAllModels && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowAllModels(false)}
            />
            <div className="absolute top-full right-6 z-20 mt-1 bg-zinc-900 rounded-2xl p-1.5 shadow-2xl shadow-black/60 w-72 max-h-96 overflow-y-auto animate-panel-in">
                {(() => {
                  const paid = MODELS.filter((m) => isPaid(m.id));
                  const free = MODELS.filter((m) => !isPaid(m.id));
                  const renderRow = (model: (typeof MODELS)[number]) => {
                    const active = models.some((mm) => mm.id === model.id);
                    const limited = isRateLimited(model.id);
                    const atCap = models.length >= 3 && !active;
                    const paidStyle = isPaid(model.id);
                    const disabled = atCap || limited;
                    return (
                      <button
                        key={model.id}
                        onClick={() =>
                          !disabled &&
                          (active ? removeModel(model) : addModel(model))
                        }
                        disabled={disabled}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-colors ${
                          limited
                            ? "text-zinc-700 line-through cursor-not-allowed"
                            : active
                              ? paidStyle
                                ? "bg-amber-950/40 text-amber-200 cursor-pointer"
                                : "bg-zinc-800 text-zinc-200 cursor-pointer"
                              : atCap
                                ? "text-zinc-700 cursor-not-allowed"
                                : paidStyle
                                  ? "text-amber-600/80 hover:bg-amber-950/30 hover:text-amber-300 cursor-pointer"
                                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={model.icon}
                            alt={model.name}
                            className={`w-3.5 h-3.5 rounded-sm shrink-0 ${disabled ? "opacity-30" : ""}`}
                          />
                          {paidStyle && !limited && (
                            <span className="text-[9px] text-amber-600 shrink-0">★</span>
                          )}
                          <span className="truncate">{model.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 shrink-0">
                          {limited
                            ? `${rateLimitMinsLeft(model.id)}m`
                            : paidStyle
                              ? `$${model.pricing.prompt}/$${model.pricing.completion}`
                              : "free"}
                        </span>
                      </button>
                    );
                  };
                  return (
                    <>
                      {paid.length > 0 && (
                        <>
                          <div className="text-[9px] uppercase text-amber-600/60 tracking-wider px-3 pt-1 pb-1">
                            ★ Premium
                          </div>
                          <div className="space-y-0.5">{paid.map(renderRow)}</div>
                        </>
                      )}
                      {free.length > 0 && (
                        <>
                          <div className="text-[9px] uppercase text-zinc-600 tracking-wider px-3 pt-3 pb-1">
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

      {/* ── Messages ── */}
      <div
        ref={unifiedScrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto px-6 space-y-8 py-4 pb-8">
          {messages.length === 0 && Object.keys(streamingContent).length === 0 && (
            <p className="text-zinc-600 text-sm mt-20 select-none">
              Ask anything. All models will respond.
            </p>
          )}

          {messages.map((message, i) => {
            const meta = message.model
              ? MODELS.find((m) => m.id === message.model)
              : null;

            // Blind mode state for this message
            const isBlindTarget =
              blindMode &&
              message.role === "assistant" &&
              !message.synthesis &&
              !!message.model;
            const blindInfo = isBlindTarget ? msgBlindInfo.get(i) : undefined;
            const roundChosenIdx = blindInfo
              ? chosenByRound.get(blindInfo.userIdx)
              : undefined;
            const roundRevealed = roundChosenIdx !== undefined;
            const isChosen = roundChosenIdx === i;
            const canPick = isBlindTarget && !roundRevealed;

            // Find the user message index that triggered this assistant response
            const findUserMsgIdx = () => {
              for (let j = i - 1; j >= 0; j--) {
                if (messages[j].role === "user") return j;
              }
              return -1;
            };

            const isNormalAssistant =
              message.role === "assistant" &&
              !message.synthesis &&
              !blindMode &&
              !!message.model;

            return (
              <div
                key={i}
                className={`flex flex-col animate-msg-in ${
                  message.model ? "items-start" : "items-end"
                } ${canPick ? "cursor-pointer" : ""}`}
                onClick={canPick ? () => pickResponse(i) : undefined}
              >
                {/* User message */}
                {!message.model ? (
                  <p className="text-sm leading-relaxed bg-zinc-800 text-zinc-100 rounded-2xl px-5 py-3.5 whitespace-pre-wrap shadow-sm max-w-[85%]">
                    {message.content}
                  </p>
                ) : (
                  /* Assistant message — card container */
                  <div
                    className={`max-w-[85%] rounded-2xl overflow-hidden ${
                      canPick ? "transition-opacity hover:opacity-75" : ""
                    } ${
                      message.synthesis
                        ? "bg-amber-950/25"
                        : canPick
                          ? "bg-indigo-950/30"
                          : isChosen
                            ? "bg-amber-950/15"
                            : (message.model && !blindMode)
                              ? "bg-zinc-800/50"
                              : ""
                    } group`}
                  >
                    {/* Label row */}
                    <div className="px-4 pt-3 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        {canPick ? (
                          // Blind: not yet picked — show letter only
                          <p className="text-[11px] uppercase tracking-wider text-indigo-400/50 select-none">
                            Response {blindInfo?.letter}
                          </p>
                        ) : isBlindTarget && roundRevealed ? (
                          // Blind: revealed — show model + chosen badge
                          <>
                            {meta && (
                              <img
                                src={meta.icon}
                                alt={meta.name}
                                className="w-4 h-4 rounded-sm"
                              />
                            )}
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              {meta?.name ?? message.model}
                            </p>
                            {isChosen && (
                              <span className="text-xs text-amber-400 font-medium">
                                · ★ your pick
                              </span>
                            )}
                            {message.usage && (
                              <span className="text-xs text-zinc-600">
                                · {formatUsd(message.usage.cost)}
                                {message.usage.latencyMs !== undefined && (
                                  <> · {formatLatency(message.usage.latencyMs)}</>
                                )}
                              </span>
                            )}
                          </>
                        ) : message.synthesis ? (
                          // Synthesis message — always visible
                          <>
                            <span className="text-amber-400">
                              <SparkleIcon />
                            </span>
                            <p className="text-xs uppercase tracking-wide font-medium text-amber-400/80">
                              Synthesis · {meta?.name ?? message.model}
                            </p>
                            {message.usage && (
                              <span className="text-xs text-zinc-600">
                                · {formatUsd(message.usage.cost)}
                                {message.usage.latencyMs !== undefined && (
                                  <> · {formatLatency(message.usage.latencyMs)}</>
                                )}
                              </span>
                            )}
                          </>
                        ) : (
                          // Normal (non-blind) assistant message
                          <>
                            {meta && (
                              <img
                                src={meta.icon}
                                alt={meta.name}
                                className="w-4 h-4 rounded-sm"
                              />
                            )}
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              {meta?.name ?? message.model}
                            </p>
                            {message.usage && (
                              <span className="text-xs text-zinc-600">
                                · {formatUsd(message.usage.cost)}
                                {message.usage.latencyMs !== undefined && (
                                  <> · {formatLatency(message.usage.latencyMs)}</>
                                )}
                              </span>
                            )}
                            {/* Copy + Regen buttons — hover only */}
                            {isNormalAssistant && (
                              <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(message.content, i);
                                  }}
                                  title="Copy"
                                  className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
                                >
                                  {copiedIdx === i ? <CheckIcon /> : <ClipboardIcon />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const userIdx = findUserMsgIdx();
                                    if (userIdx !== -1 && message.model) {
                                      handleRegenerate(message.model, userIdx);
                                    }
                                  }}
                                  title="Regenerate"
                                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer leading-none"
                                >
                                  ↺ Regen
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Message body */}
                    <div className="px-4 pb-4">
                      {message.content === "⚠ rate_limit_free" ? (
                        <RateLimitMessage free={true} />
                      ) : message.content === "⚠ rate_limit_paid" ? (
                        <RateLimitMessage free={false} />
                      ) : message.content.startsWith("⚠") ? (
                        <p className="text-sm leading-relaxed text-red-400 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <Markdown content={message.content} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Streaming messages */}
          {Object.entries(streamingContent).map(([modelId, content]) => {
            if (!content) return null;
            const meta = MODELS.find((m) => m.id === modelId);
            return (
              <div key={`stream-${modelId}`} className="flex flex-col items-start animate-msg-in">
                <div className="max-w-[85%] w-full rounded-2xl bg-zinc-800/50 overflow-hidden">
                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                    {meta && <img src={meta.icon} alt={meta.name} className="w-4 h-4 rounded-sm opacity-70" />}
                    <p className="text-xs uppercase tracking-wide text-zinc-500">{meta?.name ?? modelId}</p>
                    <span className="ml-auto flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="inline-block w-1 h-1 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <Markdown content={content} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Spinner — only in blind mode where we don't show partial streaming */}
          {isLoading && Object.keys(streamingContent).length === 0 && (
            <div className="flex gap-1.5 items-center px-1 py-2">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}
        </div>{/* close messages inner */}
      </div>{/* close scroll container */}

      {/* ── Chips + input ── */}
      <div className="max-w-2xl mx-auto w-full px-6 pb-6 pt-3 shrink-0">
        {/* Active model chips — hidden in blind mode */}
        {models.length > 0 && !blindMode && (
          <div className="flex flex-wrap gap-2 pb-3">
            {models.map((model) => {
              const paid = isPaid(model.id);
              return (
                <button
                  key={model.id}
                  onClick={() => removeModel(model)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    paid
                      ? "bg-amber-950/30 text-amber-300 hover:bg-amber-950/50"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-zinc-100"
                  }`}
                >
                  <img
                    src={model.icon}
                    alt={model.name}
                    className="w-4 h-4 rounded-sm opacity-80"
                  />
                  {paid && <span className="text-[9px] text-amber-400">★</span>}
                  {model.name}
                  <span className="text-zinc-500 hover:text-zinc-300 ml-1">×</span>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="inline-flex items-center gap-1.5 text-sm text-red-400 bg-red-950/30 rounded-xl px-3 py-1.5 mb-2">
            {`Error: ${error}`}
          </div>
        )}

        {/* Input */}
        <div className="pb-2 shrink-0">
          <div className={`flex items-center gap-2 bg-zinc-800/60 rounded-2xl px-5 py-4 transition-all duration-200 ${
            isLoading || overLimit ? "opacity-60" : ""
          }`}>
            <input
              ref={inputRef}
              type="text"
              placeholder={overLimit ? "Daily limit reached" : "Ask anything..."}
              value={userMessage}
              onChange={(e) =>
                setUserMessage(e.target.value.slice(0, MAX_INPUT_CHARS))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage(userMessage);
                if (e.key === "Escape") setShowAllModels(false);
              }}
              disabled={isLoading || overLimit}
              className="flex-1 text-base text-zinc-100 placeholder-zinc-500 outline-none bg-transparent"
            />
            {isLoading ? (
              <button
                onClick={handleCancel}
                title="Cancel"
                className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-1 shrink-0"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                onClick={() => handleSendMessage(userMessage)}
                disabled={overLimit}
                title="Send"
                className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer p-1 shrink-0"
              >
                <SendIcon />
              </button>
            )}
          </div>
          {userMessage.length > MAX_INPUT_CHARS * 0.8 && (
            <p
              className={`text-[10px] text-right tabular-nums mt-1 ${
                userMessage.length >= MAX_INPUT_CHARS
                  ? "text-red-400"
                  : "text-zinc-600"
              }`}
            >
              {userMessage.length}/{MAX_INPUT_CHARS}
            </p>
          )}
        </div>{/* close input wrapper */}
      </div>{/* close chips+input */}
    </div>
  );
}
