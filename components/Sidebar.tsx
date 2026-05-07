"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Chat } from "@/types/chat";
import { authClient } from "@/lib/auth/client";
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
  credits: number | null;
  trialUsed: number;
  trialLimit: number;
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
  credits,
  trialUsed,
  trialLimit,
  isOpen,
  onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isTrial = !user;

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  };

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

  const trialRemaining = Math.max(0, trialLimit - trialUsed);
  const creditsPct = isTrial
    ? (trialRemaining / trialLimit) * 100
    : credits !== null ? Math.min(100, (credits / 2500) * 100) : 100;
  const creditsLabel = isTrial
    ? trialRemaining <= 0
      ? "Trial ended"
      : `${trialRemaining} of ${trialLimit} trial messages left`
    : credits === null
      ? "Loading…"
      : credits <= 0
        ? "No credits left"
        : credits < 100
          ? `${credits} credits left`
          : `${credits.toLocaleString()} credits`;
  const creditsHint = isTrial
    ? trialRemaining <= 0
      ? "Sign up for 2,500 free credits."
      : "Sign up for 2,500 free credits."
    : overLimit
      ? "Top up to keep chatting."
      : creditsPct > 60
        ? "Plenty of credits"
        : creditsPct > 20
          ? "Getting low"
          : "Almost out";

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
            <Link href="/">
              <img
                src="/logo.png"
                alt="Multi-Model"
                className="w-8 h-8 rounded-[9px] shrink-0 mb-1 object-contain"
              />
            </Link>

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

            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer"
              style={{ color: "var(--cz-text)", opacity: 0.4 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(237,230,221,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.background = "transparent"; }}
            >
              <ChevronRightIcon />
            </button>

            <div className="flex-1" />
          </div>
        )}

        {/* ── Full sidebar ── */}
        {!collapsed && (
          <>
            {/* Brand */}
            <div className="px-3 py-[22px] pb-3 flex items-center gap-3 px-[22px]">
              <Link href="/" className="flex items-center gap-3 flex-1 min-w-0">
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
              </Link>
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

            {/* Credits */}
            <div className="px-3 pt-3 mx-1">
              <div className="px-3 py-3 rounded-lg" style={{ background: "rgba(237,230,221,0.03)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11.5px]" style={{ opacity: 0.6 }}>Credits</span>
                  <span
                    className="text-[11.5px] font-medium"
                    style={{ color: overLimit ? "#E89B9B" : "var(--cz-accent)" }}
                  >
                    {creditsLabel}
                  </span>
                </div>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(237,230,221,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${creditsPct}%`,
                      background: overLimit ? "#E89B9B" : creditsPct < 20 ? "#f59e0b" : "var(--cz-accent)",
                    }}
                  />
                </div>
                <div className="text-[11px] mt-1.5" style={{ opacity: 0.4 }}>
                  {creditsHint}
                </div>
              </div>
            </div>

            {/* User profile */}
            {user && (
              <div
                className="mx-3 my-3 px-3 py-2.5 rounded-lg flex items-center gap-2.5"
                style={{ borderTop: "1px solid rgba(237,230,221,0.06)" }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    width: 28,
                    height: 28,
                    background: "var(--cz-accent-soft)",
                    color: "var(--cz-accent)",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  {user.name && (
                    <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--cz-text)" }}>
                      {user.name}
                    </div>
                  )}
                  <div className="text-[11px] truncate" style={{ opacity: 0.45 }}>
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Sign out"
                  className="shrink-0 cursor-pointer transition-opacity"
                  style={{ opacity: 0.4 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
