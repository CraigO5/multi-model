"use client";

import { useRef, useState } from "react";
import type { Chat } from "@/types/chat";
import { DAILY_LIMIT_USD } from "@/lib/models";
import { formatUsd } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

type Props = {
  filteredChats: Chat[];
  activeChatId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  newChat: () => void;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  editTitle: (id: string, newTitle: string) => void;
  exportChat: (chat: Chat) => void;
  overLimit: boolean;
  dailySpend: number;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({
  filteredChats,
  activeChatId,
  searchQuery,
  setSearchQuery,
  newChat,
  switchChat,
  deleteChat,
  editTitle,
  exportChat,
  overLimit,
  dailySpend,
  isOpen,
  onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditingValue(chat.title);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editingId) editTitle(editingId, editingValue);
    setEditingId(null);
  };

  const handleSwitchChat = (id: string) => {
    switchChat(id);
    onClose();
  };

  const handleNewChat = () => {
    newChat();
    onClose();
  };

  const spendPct = Math.min(100, (dailySpend / DAILY_LIMIT_USD) * 100);
  const spendLabel = dailySpend === 0 ? "Nothing spent yet" : dailySpend < 0.01 ? "Less than a cent" : `About ${formatUsd(dailySpend)}`;
  const spendHint = overLimit ? "Limit reached. Resets at midnight." : spendPct < 30 ? "Plenty left today" : spendPct < 75 ? "Getting there" : "Almost at the limit";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        style={{ background: "var(--cz-surface)" }}
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          transition-all duration-300 ease-in-out
          md:relative md:inset-auto md:z-auto md:translate-x-0 md:shrink-0
          ${isOpen ? "translate-x-0 w-[250px]" : "-translate-x-full w-[250px]"}
          ${collapsed ? "md:w-14" : "md:w-[250px]"}
        `}
      >
        {/* ── Collapsed icon rail (desktop only) ── */}
        {collapsed && (
          <div className="hidden md:flex flex-col items-center py-5 gap-3 flex-1">
            <img
              src="/logo.png"
              alt="Multi-Model"
              className="w-8 h-8 rounded-[9px] shrink-0 mb-1 object-contain"
            />

            <button
              onClick={handleNewChat}
              title="New chat"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer"
              style={{ color: "var(--cz-text)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(237,230,221,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <PlusIcon />
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer mb-1"
              style={{ color: "var(--cz-text)", opacity: 0.4 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(237,230,221,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.background = "transparent"; }}
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}

        {/* ── Full sidebar ── */}
        {!collapsed && (
          <>
            {/* Brand */}
            <div className="px-3 py-[22px] pb-3 flex items-center gap-3 px-[22px]">
              <img
                src="/logo.png"
                alt="Multi-Model"
                className="w-[30px] h-[30px] rounded-[9px] shrink-0 object-contain"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold tracking-tight" style={{ color: "var(--cz-text)" }}>
                  Multi-Model
                </div>
                <div className="text-[11px] mt-[1px]" style={{ opacity: 0.5 }}>
                  3 AIs, one chat
                </div>
              </div>
              {/* Mobile close */}
              <button
                onClick={onClose}
                className="cursor-pointer p-1 md:hidden transition-opacity"
                style={{ opacity: 0.5 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
              >
                <XIcon />
              </button>
              {/* Desktop collapse */}
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="hidden md:flex cursor-pointer p-1 transition-opacity"
                style={{ opacity: 0.4 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
              >
                <ChevronLeftIcon />
              </button>
            </div>

            {/* New chat */}
            <div className="px-3 pb-1">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2.5 text-[13.5px] font-medium px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-[120ms]"
                style={{ color: "var(--cz-text)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(237,230,221,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 16, opacity: 0.7 }}>＋</span>
                New chat
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <div
                className="relative flex items-center rounded-lg px-3 py-2 transition-all duration-[120ms]"
                style={{ paddingLeft: 34 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(237,230,221,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ opacity: 0.5 }}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search your chats"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-[13px] placeholder-current"
                  style={{ color: "var(--cz-text)" }}
                />
              </div>
            </div>

            {/* Section label */}
            {filteredChats.length > 0 && (
              <div
                className="px-[22px] pt-2 pb-0.5 text-[11px] uppercase tracking-[0.06em]"
                style={{ opacity: 0.4 }}
              >
                {searchQuery ? "Results" : "Today"}
              </div>
            )}

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
              {filteredChats.length === 0 && (
                <p className="text-xs text-center mt-4 px-3" style={{ opacity: 0.35 }}>
                  {searchQuery ? "No matches" : "No chats yet"}
                </p>
              )}
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => editingId !== chat.id && handleSwitchChat(chat.id)}
                  className={`group relative flex items-center gap-2 px-3 py-[9px] rounded-lg transition-all duration-[120ms] cursor-pointer`}
                  style={{
                    background: activeChatId === chat.id || editingId === chat.id
                      ? "rgba(237,230,221,0.08)"
                      : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (activeChatId !== chat.id && editingId !== chat.id) {
                      e.currentTarget.style.background = "rgba(237,230,221,0.04)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeChatId !== chat.id && editingId !== chat.id) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {editingId === chat.id ? (
                    <input
                      ref={editInputRef}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-[13px] bg-transparent outline-none min-w-0 border-b"
                      style={{ color: "var(--cz-text)", borderColor: "rgba(237,230,221,0.3)" }}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: "var(--cz-text)" }}>
                        {chat.title}
                      </div>
                      <div className="text-[11px] mt-0.5 truncate" style={{ opacity: 0.45 }}>
                        {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => startEditing(chat, e)}
                      title="Rename"
                      className="cursor-pointer p-0.5 transition-opacity"
                      style={{ opacity: 0.4 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportChat(chat); }}
                      title="Export as markdown"
                      className="cursor-pointer p-0.5 transition-opacity"
                      style={{ opacity: 0.4 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
                    >
                      <DownloadIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      title="Delete"
                      className="cursor-pointer p-0.5 transition-opacity"
                      style={{ opacity: 0.4 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#E89B9B"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = ""; }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily spend */}
            <div className="px-3 py-3 mx-1 mb-1">
              <div className="px-3 py-3 rounded-lg" style={{ background: "rgba(237,230,221,0.03)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11.5px]" style={{ opacity: 0.6 }}>Today's spend</span>
                  <span
                    className="text-[11.5px] font-medium"
                    style={{ color: overLimit ? "#E89B9B" : "var(--cz-accent)" }}
                  >
                    {spendLabel}
                  </span>
                </div>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(237,230,221,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${spendPct}%`,
                      background: overLimit ? "#E89B9B" : "var(--cz-accent)",
                    }}
                  />
                </div>
                <div className="text-[11px] mt-1.5" style={{ opacity: 0.4 }}>
                  {spendHint}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
