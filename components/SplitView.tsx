"use client";

import { useState } from "react";
import type { Slot } from "@/types/chat";
import { MODELS } from "@/lib/models";
import { isPaid, formatUsd } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { GripIcon, MergeIcon, StopIcon } from "@/components/icons";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { RateLimitMessage } from "@/components/RateLimitMessage";

type Props = {
  slots: Slot[];
  setSlots: React.Dispatch<React.SetStateAction<Slot[]>>;
  swapSlot: number | null;
  setSwapSlot: (i: number | null) => void;
  hoveredSlot: number | null;
  setHoveredSlot: (i: number | null) => void;
  mergingFrom: number | null;
  slotScrollRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  overLimit: boolean;
  isRateLimited: (modelId: string) => boolean;
  rateLimitMinsLeft: (modelId: string) => number;
  handleMerge: (slotIndex: number) => void;
  handleSwapModel: (slotIndex: number, newModelId: string) => void;
  handleSplitSend: (slotIndex: number) => void;
  handleSlotCancel: (slotIndex: number) => void;
};

function SlotModelIcon({ model, size = 22 }: { model: (typeof MODELS)[number]; size?: number }) {
  const [errored, setErrored] = useState(false);
  const color = (model as { color?: string }).color ?? "#888";
  const initial = (model as { initial?: string }).initial ?? model.name[0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color + "28",
        border: `1.5px solid ${color}50`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!errored ? (
        <img
          src={model.icon}
          alt={model.name}
          style={{ width: size * 0.6, height: size * 0.6, objectFit: "contain" }}
          onError={() => setErrored(true)}
        />
      ) : (
        <span style={{ fontSize: size * 0.42, fontWeight: 700, color, lineHeight: 1 }}>
          {initial}
        </span>
      )}
    </div>
  );
}

export function SplitView({
  slots,
  setSlots,
  swapSlot,
  setSwapSlot,
  hoveredSlot,
  setHoveredSlot,
  mergingFrom,
  slotScrollRefs,
  overLimit,
  isRateLimited,
  rateLimitMinsLeft,
  handleMerge,
  handleSwapModel,
  handleSplitSend,
  handleSlotCancel,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [justDropped, setJustDropped] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && index !== dragIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;

    setSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setJustDropped(targetIndex);
    setTimeout(() => setJustDropped(null), 600);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const sep = "1px solid rgba(237,230,221,0.06)";

  return (
    <div
      className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
      onClick={() => setSwapSlot(null)}
    >
      {slots.map((slot, slotIndex) => {
        const meta = MODELS.find((m) => m.id === slot.modelId);
        const isSwapOpen = swapSlot === slotIndex;
        const isDragging = dragIndex === slotIndex;
        const isDropTarget = dragOverIndex === slotIndex && dragIndex !== slotIndex;
        const wasJustDropped = justDropped === slotIndex;
        const metaColor = meta ? ((meta as { color?: string }).color ?? "var(--cz-accent)") : "var(--cz-accent)";

        return (
          <div
            key={slot.modelId}
            draggable
            onDragStart={(e) => handleDragStart(e, slotIndex)}
            onDragOver={(e) => handleDragOver(e, slotIndex)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, slotIndex)}
            onDragEnd={handleDragEnd}
            className={`flex flex-col last:border-b-0 min-w-0 select-none min-h-[60vh] md:min-h-0 ${
              mergingFrom !== null ? "animate-panel-out" : "animate-panel-in"
            } ${isDragging ? "opacity-30" : "opacity-100"} ${
              wasJustDropped ? "animate-msg-in" : ""
            }`}
            style={{
              borderRight: sep,
              borderBottom: sep,
              flexGrow:
                mergingFrom !== null
                  ? mergingFrom === slotIndex ? 1 : 0
                  : hoveredSlot === null ? 1 : hoveredSlot === slotIndex ? 1.0 : 1,
              flexBasis: 0,
              transition: "flex-grow 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease",
              animationDelay:
                mergingFrom !== null
                  ? `${(slots.length - 1 - slotIndex) * 30}ms`
                  : `${slotIndex * 60}ms`,
              boxShadow: isDropTarget
                ? `inset 3px 0 0 0 ${metaColor}99`
                : "none",
            }}
            onMouseEnter={() => dragIndex === null && setHoveredSlot(slotIndex)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            {/* Panel header */}
            <div
              className="px-4 pt-4 pb-3 shrink-0 relative"
              style={{ borderBottom: sep, background: "var(--cz-surface)" }}
            >
              <div className="flex items-center gap-2.5">
                {/* Drag handle */}
                <span
                  className="cursor-grab active:cursor-grabbing shrink-0 transition-opacity"
                  style={{ color: "var(--cz-text)", opacity: 0.25 }}
                  title="Drag to reorder"
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.25")}
                >
                  <GripIcon size={15} />
                </span>

                {/* Model picker */}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapSlot(isSwapOpen ? null : slotIndex);
                  }}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  {meta && <SlotModelIcon model={meta} size={22} />}
                  <span
                    className="text-[13px] font-medium transition-opacity"
                    style={{ color: "var(--cz-text)", opacity: 0.75 }}
                  >
                    {meta?.name ?? slot.modelId}
                  </span>
                  <span style={{ color: "var(--cz-text)", opacity: 0.3, fontSize: 10 }}>▾</span>
                </button>

                {/* Premium badge */}
                {meta && isPaid(meta.id) && (
                  <span
                    className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(251,191,36,0.12)", color: "#F59E0B" }}
                  >
                    Premium
                  </span>
                )}
              </div>

              {/* Usage line */}
              {meta && (() => {
                const panelUsage = [...slot.preSplitMessages, ...slot.postSplitMessages].reduce(
                  (acc, m) => {
                    if (m.usage) {
                      acc.tokens += m.usage.promptTokens + m.usage.completionTokens;
                      acc.cost += m.usage.cost;
                    }
                    return acc;
                  },
                  { tokens: 0, cost: 0 }
                );
                if (panelUsage.tokens === 0) return null;
                return (
                  <p className="mt-1.5 pl-[37px] text-[11px]" style={{ color: "var(--cz-text)", opacity: 0.3 }}>
                    {panelUsage.tokens.toLocaleString()} tokens · {formatUsd(panelUsage.cost)}
                  </p>
                );
              })()}

              {/* Swap dropdown */}
              {isSwapOpen && (
                <div
                  className="absolute top-full left-4 mt-1 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 animate-panel-in shadow-2xl min-w-[220px]"
                  style={{
                    background: "var(--cz-surface)",
                    border: "1px solid rgba(237,230,221,0.08)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {MODELS.map((m) => {
                    const limited = isRateLimited(m.id);
                    const paid = isPaid(m.id);
                    const active = m.id === slot.modelId;
                    const mColor = (m as { color?: string }).color ?? "#888";
                    return (
                      <button
                        key={m.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => !limited && handleSwapModel(slotIndex, m.id)}
                        disabled={limited}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-[13px] w-full text-left transition-all duration-100 cursor-pointer"
                        style={{
                          background: active ? "rgba(237,230,221,0.08)" : "transparent",
                          color: limited
                            ? "rgba(237,230,221,0.2)"
                            : "var(--cz-text)",
                          opacity: limited ? 0.5 : 1,
                          textDecoration: limited ? "line-through" : "none",
                          cursor: limited ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={e => {
                          if (!limited && !active) (e.currentTarget as HTMLElement).style.background = "rgba(237,230,221,0.05)";
                        }}
                        onMouseLeave={e => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <SlotModelIcon model={m} size={18} />
                          <span style={{ opacity: limited ? 0.4 : 0.85 }}>{m.name}</span>
                          {paid && !limited && (
                            <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", color: "#F59E0B" }}>
                              ★
                            </span>
                          )}
                        </div>
                        <span className="text-[11px]" style={{ opacity: 0.3 }}>
                          {limited
                            ? `${rateLimitMinsLeft(m.id)}m`
                            : `$${m.pricing.prompt}/$${m.pricing.completion}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              ref={(el) => { slotScrollRefs.current[slotIndex] = el; }}
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
            >
              {slot.preSplitMessages.map((message, j) => {
                const msgMeta = message.model ? MODELS.find((m) => m.id === message.model) : null;
                return (
                  <div
                    key={j}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {msgMeta && message.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <SlotModelIcon model={msgMeta} size={14} />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--cz-text)", opacity: 0.35 }}>
                          {msgMeta.name}
                        </span>
                      </div>
                    )}
                    {message.role === "user" ? (
                      <p
                        className="text-[13.5px] leading-relaxed max-w-[88%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap"
                        style={{ background: "rgba(237,230,221,0.08)", color: "var(--cz-text)" }}
                      >
                        {message.content}
                      </p>
                    ) : (
                      <div className="max-w-[92%] text-[13.5px]">
                        {message.content === "⚠ rate_limit_free" ? (
                          <RateLimitMessage free={true} />
                        ) : message.content === "⚠ rate_limit_paid" ? (
                          <RateLimitMessage free={false} />
                        ) : message.content.startsWith("⚠") ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#E89B9B" }}>
                            {message.content}
                          </p>
                        ) : (
                          <Markdown content={message.content} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {slot.preSplitMessages.length > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(237,230,221,0.06)" }} />
                  <span className="text-[10px] uppercase tracking-widest select-none" style={{ color: "var(--cz-text)", opacity: 0.25 }}>
                    Split
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(237,230,221,0.06)" }} />
                </div>
              )}

              {slot.postSplitMessages.map((message, j) => {
                const msgMeta = message.model ? MODELS.find((m) => m.id === message.model) : null;
                return (
                  <div
                    key={`post-${j}`}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} ${message.role === "user" ? "animate-msg-in" : ""}`}
                  >
                    {msgMeta && message.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <SlotModelIcon model={msgMeta} size={14} />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--cz-text)", opacity: 0.35 }}>
                          {msgMeta.name}
                        </span>
                      </div>
                    )}
                    {message.role === "user" ? (
                      <p
                        className="text-[13.5px] leading-relaxed max-w-[88%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap"
                        style={{ background: "rgba(237,230,221,0.08)", color: "var(--cz-text)" }}
                      >
                        {message.content}
                      </p>
                    ) : (
                      <div className="max-w-[92%] text-[13.5px]">
                        {message.content === "⚠ rate_limit_free" ? (
                          <RateLimitMessage free={true} />
                        ) : message.content === "⚠ rate_limit_paid" ? (
                          <RateLimitMessage free={false} />
                        ) : message.content.startsWith("⚠") ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#E89B9B" }}>
                            {message.content}
                          </p>
                        ) : (
                          <Markdown content={message.content} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {slot.isLoading && (
                <div className="flex gap-1.5 items-center pl-0.5">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "var(--cz-accent)", opacity: 0.45, animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input + merge */}
            <div
              className="px-4 py-3 flex items-center gap-3 shrink-0"
              style={{ borderTop: sep }}
            >
              <input
                type="text"
                placeholder={overLimit ? "Daily limit reached" : "Message…"}
                value={slot.input}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((s, i) => i === slotIndex ? { ...s, input: e.target.value } : s)
                  )
                }
                onKeyDown={(e) => { if (e.key === "Enter") handleSplitSend(slotIndex); }}
                onClick={(e) => e.stopPropagation()}
                disabled={slot.isLoading || overLimit}
                className="flex-1 text-[13.5px] outline-none bg-transparent min-w-0 cursor-text"
                style={{ color: "var(--cz-text)", opacity: overLimit ? 0.3 : 1 }}
              />

              {slot.isLoading ? (
                <button
                  onClick={() => handleSlotCancel(slotIndex)}
                  title="Cancel"
                  className="cursor-pointer shrink-0 p-1 transition-opacity"
                  style={{ color: "#E89B9B", opacity: 0.7 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                >
                  <StopIcon size={15} />
                </button>
              ) : (
                <button
                  onClick={() => handleSplitSend(slotIndex)}
                  disabled={overLimit || !slot.input.trim()}
                  title="Send"
                  className="cursor-pointer shrink-0 transition-opacity disabled:opacity-20"
                  style={{ color: "var(--cz-accent)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                >
                  <PaperPlaneTilt size={15} weight="bold" />
                </button>
              )}

              <div className="w-px h-3 shrink-0" style={{ background: "rgba(237,230,221,0.1)" }} />

              <button
                onClick={() => handleMerge(slotIndex)}
                title="Merge into main chat"
                className="flex items-center gap-1.5 text-[12px] cursor-pointer shrink-0 transition-opacity"
                style={{ color: "var(--cz-text)", opacity: 0.35 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.35")}
              >
                <MergeIcon size={14} />
                Merge
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
