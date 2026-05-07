"use client";

import { useRef, useState } from "react";
import type { Chat } from "@/types/chat";
import { DAILY_LIMIT_CREDITS, DAILY_LIMIT_USD } from "@/lib/models";
import { formatCredits, usdToCredits } from "@/lib/utils";
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
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 border-r border-zinc-800/50
          transition-all duration-300 ease-in-out
          md:relative md:inset-auto md:z-auto md:translate-x-0 md:shrink-0
          ${isOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"}
          ${collapsed ? "md:w-14" : "md:w-64"}
        `}
      >
        {/* ── Collapsed icon rail (desktop only) ── */}
        {collapsed && (
          <div className="hidden md:flex flex-col items-center py-4 gap-3 flex-1">
            {/* Logo */}
            <div className="w-8 h-8 rounded-2xl bg-zinc-800 flex items-center justify-center p-1.5 mb-1">
              <img
                src="/logo.png"
                alt="Multi-Model"
                className="w-full h-full object-contain"
                style={{ filter: "invert(1) brightness(0.9) opacity(0.9)" }}
              />
            </div>

            {/* New chat */}
            <button
              onClick={handleNewChat}
              title="New chat"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-all duration-200 cursor-pointer"
            >
              <PlusIcon />
            </button>

            <div className="flex-1" />

            {/* Expand */}
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-200 cursor-pointer mb-1"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}

        {/* ── Full sidebar ── */}
        {!collapsed && (
          <>
            {/* Brand */}
            <div className="px-4 py-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 p-1.5">
                <img
                  src="/logo.png"
                  alt="Multi-Model"
                  className="w-full h-full object-contain"
                  style={{ filter: "invert(1) brightness(0.9) opacity(0.9)" }}
                />
              </div>
              <span className="text-sm font-semibold text-zinc-100 tracking-tight flex-1">Multi-Model</span>
              {/* Mobile close */}
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-200 cursor-pointer p-1 md:hidden"
              >
                <XIcon />
              </button>
              {/* Desktop collapse */}
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="hidden md:flex text-zinc-600 hover:text-zinc-300 cursor-pointer p-1 transition-colors"
              >
                <ChevronLeftIcon />
              </button>
            </div>

            {/* Actions */}
            <div className="px-3 pb-3 space-y-2">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 hover:text-zinc-100 transition-all duration-200 cursor-pointer font-medium"
              >
                <PlusIcon />
                New chat
              </button>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800/60 rounded-xl pl-7 pr-2 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
              {filteredChats.length === 0 && (
                <p className="text-xs text-zinc-700 text-center mt-4">
                  {searchQuery ? "No matches" : "No chats yet"}
                </p>
              )}
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => editingId !== chat.id && handleSwitchChat(chat.id)}
                  className={`group relative flex items-center gap-2 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    editingId === chat.id
                      ? "bg-zinc-800 text-zinc-100"
                      : activeChatId === chat.id
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                  }`}
                >
                  {activeChatId === chat.id && editingId !== chat.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-full" />
                  )}
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
                      className="flex-1 text-xs bg-transparent text-zinc-100 outline-none border-b border-zinc-600 focus:border-zinc-400 min-w-0 pb-px"
                    />
                  ) : (
                    <span className="text-sm truncate flex-1">{chat.title}</span>
                  )}
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEditing(chat, e)}
                      title="Rename"
                      className="text-zinc-700 hover:text-zinc-300 cursor-pointer"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportChat(chat); }}
                      title="Export as markdown"
                      className="text-zinc-700 hover:text-zinc-300 cursor-pointer"
                    >
                      <DownloadIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      title="Delete"
                      className="text-zinc-700 hover:text-red-400 cursor-pointer"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily spend */}
            <div className="px-4 py-4 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest">Today</span>
                <span className={`font-mono text-xs tabular-nums ${overLimit ? "text-red-400" : "text-zinc-600"}`}>
                  {formatCredits(usdToCredits(dailySpend))} / {DAILY_LIMIT_CREDITS.toLocaleString()}
                </span>
              </div>
              <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    overLimit ? "bg-red-500" : dailySpend / DAILY_LIMIT_USD > 0.75 ? "bg-yellow-500" : "bg-zinc-600"
                  }`}
                  style={{ width: `${Math.min(100, (dailySpend / DAILY_LIMIT_USD) * 100)}%` }}
                />
              </div>
              {overLimit && <p className="text-xs text-red-400">Limit reached. Resets at midnight.</p>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
