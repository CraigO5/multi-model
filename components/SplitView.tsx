"use client";

import { useState } from "react";
import type { Slot } from "@/types/chat";
import { MODELS } from "@/lib/models";
import { isPaid, formatUsd } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { GripIcon, MergeIcon, SendIcon, StopIcon } from "@/components/icons";
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
    // Needed so Firefox fires dragover events
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

  return (
    <div
      className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
      onClick={() => setSwapSlot(null)}
    >
      {slots.map((slot, slotIndex) => {
        const meta = MODELS.find((m) => m.id === slot.modelId);
        const isSwapOpen = swapSlot === slotIndex;
        const isDragging = dragIndex === slotIndex;
        const isDropTarget =
          dragOverIndex === slotIndex && dragIndex !== slotIndex;
        const wasJustDropped = justDropped === slotIndex;

        return (
          <div
            key={slot.modelId}
            draggable
            onDragStart={(e) => handleDragStart(e, slotIndex)}
            onDragOver={(e) => handleDragOver(e, slotIndex)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, slotIndex)}
            onDragEnd={handleDragEnd}
            className={`flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 last:border-b-0 md:last:border-r-0 min-w-0 select-none min-h-[60vh] md:min-h-0 ${
              mergingFrom !== null ? "animate-panel-out" : "animate-panel-in"
            } ${isDragging ? "opacity-40" : "opacity-100"} ${
              wasJustDropped ? "animate-msg-in" : ""
            }`}
            style={{
              flexGrow:
                mergingFrom !== null
                  ? mergingFrom === slotIndex
                    ? 1
                    : 0
                  : hoveredSlot === null
                    ? 1
                    : hoveredSlot === slotIndex
                      ? 1.0
                      : 1,
              flexBasis: 0,
              transition:
                "flex-grow 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease",
              animationDelay:
                mergingFrom !== null
                  ? `${(slots.length - 1 - slotIndex) * 30}ms`
                  : `${slotIndex * 60}ms`,
              // Drop target: animated inset shadow acting as an insert indicator
              boxShadow: isDropTarget
                ? "inset 3px 0 0 0 rgb(99 102 241 / 0.7)"
                : "none",
            }}
            onMouseEnter={() => dragIndex === null && setHoveredSlot(slotIndex)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            {/* Panel header */}
            <div className="px-4 pt-5 pb-4 border-b border-zinc-800 shrink-0 relative">
              <div className="flex items-center gap-2">
                {/* Drag handle */}
                <span
                  className="text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                  title="Drag to reorder"
                >
                  <GripIcon />
                </span>

                {/* Model picker button */}
                <button
                  onMouseDown={(e) => e.preventDefault()} // prevent drag starting from here
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapSlot(isSwapOpen ? null : slotIndex);
                  }}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  {meta && (
                    <img
                      src={meta.icon}
                      alt={meta.name}
                      className="w-4 h-4 rounded-sm"
                    />
                  )}
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {meta?.name ?? slot.modelId}
                  </span>
                  <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
                    ▾
                  </span>
                </button>
              </div>

              {meta &&
                (() => {
                  const panelUsage = [
                    ...slot.preSplitMessages,
                    ...slot.postSplitMessages,
                  ].reduce(
                    (acc, m) => {
                      if (m.usage) {
                        acc.tokens +=
                          m.usage.promptTokens + m.usage.completionTokens;
                        acc.cost += m.usage.cost;
                      }
                      return acc;
                    },
                    { tokens: 0, cost: 0 },
                  );
                  return (
                    <div className="mt-1 space-y-0.5 pl-5">
                      <p className="text-[10px]">
                        <span
                          className={
                            isPaid(meta.id)
                              ? "text-amber-600/70"
                              : "text-zinc-600"
                          }
                        >
                          {isPaid(meta.id) ? "★ Premium · " : "Free · "}
                        </span>
                        <span className="text-zinc-600">
                          ${meta.pricing.prompt.toFixed(2)} in · $
                          {meta.pricing.completion.toFixed(2)} out / 1M
                        </span>
                      </p>
                      {panelUsage.tokens > 0 && (
                        <p className="text-[10px] text-zinc-700">
                          {panelUsage.tokens.toLocaleString()} tokens ·{" "}
                          {formatUsd(panelUsage.cost)}
                        </p>
                      )}
                    </div>
                  );
                })()}

              {isSwapOpen && (
                <div
                  className="absolute top-full left-4 mt-1 z-10 bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col gap-1 animate-panel-in shadow-xl min-w-56"
                  onClick={(e) => e.stopPropagation()}
                >
                  {MODELS.map((m) => {
                    const limited = isRateLimited(m.id);
                    const paid = isPaid(m.id);
                    return (
                      <button
                        key={m.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          !limited && handleSwapModel(slotIndex, m.id)
                        }
                        disabled={limited}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors w-full text-left ${
                          limited
                            ? "text-zinc-700 line-through cursor-not-allowed"
                            : m.id === slot.modelId
                              ? "bg-zinc-800 text-zinc-200 cursor-pointer"
                              : paid
                                ? "text-amber-600/80 hover:bg-amber-950/30 hover:text-amber-300 cursor-pointer"
                                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={m.icon}
                            alt={m.name}
                            className="w-3.5 h-3.5 rounded-sm"
                          />
                          {paid && (
                            <span className="text-[9px] text-amber-600">★</span>
                          )}
                          {m.name}
                        </div>
                        <span className="text-[10px] text-zinc-600">
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
              ref={(el) => {
                slotScrollRefs.current[slotIndex] = el;
              }}
              className="flex-1 overflow-y-auto px-4 py-5 space-y-5"
            >
              {slot.preSplitMessages.map((message, j) => {
                const msgMeta = message.model
                  ? MODELS.find((m) => m.id === message.model)
                  : null;
                return (
                  <div
                    key={j}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {msgMeta && (
                      <div className="flex items-center gap-1 mb-1">
                        <img
                          src={msgMeta.icon}
                          alt={msgMeta.name}
                          className="w-3 h-3 rounded-sm"
                        />
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
                          {msgMeta.name}
                        </span>
                      </div>
                    )}
                    {message.role === "user" ? (
                      <p className="text-sm leading-relaxed max-w-[90%] bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <div className="max-w-[90%]">
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
                    )}
                  </div>
                );
              })}

              {slot.preSplitMessages.length > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] text-zinc-700 tracking-widest uppercase select-none">
                    Split
                  </span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
              )}

              {slot.postSplitMessages.map((message, j) => {
                const msgMeta = message.model
                  ? MODELS.find((m) => m.id === message.model)
                  : null;
                return (
                  <div
                    key={`post-${j}`}
                    className={`flex flex-col animate-msg-in ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {msgMeta && (
                      <div className="flex items-center gap-1 mb-1">
                        <img
                          src={msgMeta.icon}
                          alt={msgMeta.name}
                          className="w-3 h-3 rounded-sm"
                        />
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wide">
                          {msgMeta.name}
                        </span>
                      </div>
                    )}
                    {message.role === "user" ? (
                      <p className="text-sm leading-relaxed max-w-[90%] bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <div className="max-w-[90%]">
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
                    )}
                  </div>
                );
              })}

              {slot.isLoading && (
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input + merge */}
            <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
              <input
                type="text"
                placeholder={overLimit ? "Daily limit reached" : "Message..."}
                value={slot.input}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((s, i) =>
                      i === slotIndex ? { ...s, input: e.target.value } : s,
                    ),
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSplitSend(slotIndex);
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={slot.isLoading || overLimit}
                className="flex-1 text-sm text-zinc-100 placeholder-zinc-600 outline-none bg-transparent disabled:opacity-40 min-w-0 cursor-text"
              />
              {slot.isLoading ? (
                <button
                  onClick={() => handleSlotCancel(slotIndex)}
                  title="Cancel"
                  className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0 p-1"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  onClick={() => handleSplitSend(slotIndex)}
                  disabled={overLimit}
                  title="Send"
                  className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30 transition-colors cursor-pointer shrink-0 p-1"
                >
                  <SendIcon />
                </button>
              )}
              <div className="w-px h-3 bg-zinc-800 shrink-0" />
              <button
                onClick={() => handleMerge(slotIndex)}
                title="Merge into main chat"
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <MergeIcon />
                Merge
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
