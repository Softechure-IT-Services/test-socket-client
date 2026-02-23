"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiMenu } from "react-icons/fi";
import { FaArrowLeft, FaArrowRight, FaHashtag, FaUser, FaLock } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import { Forward, Settings, X, MessageSquare } from "lucide-react";
import axiosInstance from "@/lib/axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useSidebar } from "@/app/components/ui/sidebar";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChannelResult {
  id: number;
  name: string;
  is_private: boolean;
  kind: "channel";
}

interface PersonResult {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  dm_channel_id: number | null;
  kind: "person";
}

interface MessageResult {
  id: number;
  content: string;
  created_at: string;
  channel_id: number;
  channel_name: string | null;
  is_dm_channel: boolean;
  sender_name: string | null;
  sender_avatar: string | null;
  kind: "message";
}

type AnyResult = ChannelResult | PersonResult | MessageResult;

interface SearchData {
  channels: ChannelResult[];
  people: PersonResult[];
  messages: MessageResult[];
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function highlight(text: string, query: string) {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200/30 text-inherit rounded px-0.5">
            {p}
          </mark>
        ) : (
          p
        )
      )}
    </>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ src, name, size = 6 }: { src?: string | null; name: string; size?: number }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <span
      className={`w-${size} h-${size} rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 select-none`}
    >
      {initials}
    </span>
  );
}

// ─── Flat list of all navigable results for keyboard nav ──────────────────────
function flattenResults(data: SearchData): AnyResult[] {
  return [...data.channels, ...data.people, ...data.messages];
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function AppNavbar() {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData>({ channels: [], people: [], messages: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  const flat = flattenResults(data);
  const hasResults = flat.length > 0;

  // Determine mode from prefix for UI hints
  const mode = query.startsWith("#") ? "channel" : query.startsWith("@") ? "people" : "all";
  const searchTerm = query.startsWith("#") || query.startsWith("@") ? query.slice(1).trim() : query.trim();

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setData({ channels: [], people: [], messages: [] });
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    axiosInstance
      .get<{ success: boolean; data: SearchData }>("/search", { params: { q: trimmed } })
      .then(({ data: res }) => {
        if (!cancelled && res.success) {
          setData(res.data);
          setOpen(true);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setData({ channels: [], people: [], messages: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Outside click ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        inputRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // ── Listen for focusNavSearch event from MainHeader ──────────────────────
  useEffect(() => {
    function onFocusNavSearch(e: Event) {
      const { prefill } = (e as CustomEvent<{ prefill: string }>).detail;
      setQuery(prefill ?? "");
      // Small delay so state flushes before focus
      setTimeout(() => {
        inputRef.current?.focus();
        // Place cursor at end
        const len = (prefill ?? "").length;
        inputRef.current?.setSelectionRange(len, len);
      }, 50);
    }
    window.addEventListener("focusNavSearch", onFocusNavSearch);
    return () => window.removeEventListener("focusNavSearch", onFocusNavSearch);
  }, []);

  // ── Navigate ─────────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (result: AnyResult) => {
      setOpen(false);
      setQuery("");

      if (result.kind === "channel") {
        router.push(`/channel/${result.id}`);
      } else if (result.kind === "person") {
        if (result.dm_channel_id) {
          router.push(`/channel/${result.dm_channel_id}`);
        } else {
          // No existing DM — you can open a new DM compose flow
          router.push(`/dashboard/dm/new?userId=${result.id}`);
        }
      } else if (result.kind === "message") {
        // Navigate to channel, highlight the message via hash
        router.push(`/channel/${result.channel_id}?scrollTo=${result.id}`);
      }
    },
    [router]
  );

  // ── Keyboard nav ─────────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && flat[activeIndex]) {
      e.preventDefault();
      navigate(flat[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <header className="w-full fixed top-0 z-[99] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-[var(--border-color)]">
      <div className="mx-auto max-w-8xl px-3 sm:px-6">
        <div className="flex items-center h-10 sm:h-14 justify-between">

          {/* LEFT */}
          <div className="hidden sm:grid grid-cols-12 items-center gap-3 flex-1 justify-start">
            <div className="flex items-center gap-3 flex-1 justify-between col-span-4">

              {/* Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-md hover:bg-accent flex items-center gap-1">
                    <FiMenu size={20} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DropdownMenuItem>
                        <button className="p-0 rounded-md hover:bg-accent flex items-center gap-1">Help</button>
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 rounded-lg" side={isMobile ? "bottom" : "right"} align={isMobile ? "end" : "start"}>
                      <DropdownMenuItem>Check for updates</DropdownMenuItem>
                      <DropdownMenuItem>Clear Cache and Restart</DropdownMenuItem>
                      <DropdownMenuItem>Open Help Center</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Back / Forward */}
              <div>
                <button className="p-2 rounded-md hover:bg-accent" aria-label="back" onClick={() => router.back()}>
                  <FaArrowLeft size={16} />
                </button>
                <button className="p-2 rounded-md hover:bg-accent" aria-label="forward" onClick={() => router.forward()}>
                  <FaArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* ── Search ────────────────────────────────────────────────────────── */}
            <div className="relative w-full max-w-xl col-span-8">

              {/* Input */}
              <div className="relative flex items-center">
                {loading ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin pointer-events-none" />
                ) : (
                  <CiSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => hasResults && setOpen(true)}
                  placeholder="Search messages, channels, people — # @ or plain"
                  className="w-full h-8 rounded-full pl-9 pr-8 text-sm outline-none border border-[var(--border-color)] focus:border-[var(--sidebar-foreground)] bg-transparent transition placeholder:text-muted-foreground"
                  autoComplete="off"
                  spellCheck={false}
                />

                {query && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    onClick={() => { setQuery(""); setData({ channels: [], people: [], messages: [] }); setOpen(false); inputRef.current?.focus(); }}
                    tabIndex={-1}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Mode pill */}
              {query && mode !== "all" && (
                <span className={`absolute -top-5 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  mode === "channel" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
                }`}>
                  {mode === "channel" ? "# Channels only" : "@ People only"}
                </span>
              )}

              {/* ── Dropdown ──────────────────────────────────────────────────── */}
              {open && (
                <div
                  ref={dropdownRef}
                  className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[480px] bg-[var(--sidebar)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[200] overflow-hidden"
                >
                  {/* No results */}
                  {!loading && !hasResults && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      <p className="text-base font-medium text-foreground mb-1">No results</p>
                      <p>Try a different search term or prefix with <code className="text-xs px-1 py-0.5 rounded">#</code> for channels or <code className="text-xs px-1 py-0.5 rounded">@</code> for people</p>
                    </div>
                  )}

                  {hasResults && (
                    <div className="max-h-[420px] overflow-y-auto">

                      {/* ── Channels section ──────────────────────────────────── */}
                      {data.channels.length > 0 && (
                        <section>
                          <SectionHeader label="Channels" />
                          {data.channels.map((c) => {
                            const idx = flat.indexOf(c);
                            return (
                              <ResultRow
                                key={`ch-${c.id}`}
                                active={activeIndex === idx}
                                onClick={() => navigate(c)}
                                onMouseEnter={() => setActiveIndex(idx)}
                              >
                                <span className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                  {c.is_private ? <FaLock size={9} className="text-blue-400" /> : <FaHashtag size={10} className="text-blue-400" />}
                                </span>
                                <span className="flex-1 truncate font-medium">
                                  {highlight(c.name, searchTerm)}
                                </span>
                                {c.is_private && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">private</span>
                                )}
                              </ResultRow>
                            );
                          })}
                        </section>
                      )}

                      {/* ── People section ────────────────────────────────────── */}
                      {data.people.length > 0 && (
                        <section>
                          <SectionHeader label="People" />
                          {data.people.map((p) => {
                            const idx = flat.indexOf(p);
                            return (
                              <ResultRow
                                key={`p-${p.id}`}
                                active={activeIndex === idx}
                                onClick={() => navigate(p)}
                                onMouseEnter={() => setActiveIndex(idx)}
                              >
                                <Avatar src={p.avatar_url} name={p.name} size={6} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {highlight(p.name, searchTerm)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {highlight(p.email, searchTerm)}
                                  </p>
                                </div>
                                {p.dm_channel_id && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">DM</span>
                                )}
                              </ResultRow>
                            );
                          })}
                        </section>
                      )}

                      {/* ── Messages section ──────────────────────────────────── */}
                      {data.messages.length > 0 && (
                        <section>
                          <SectionHeader label="Messages" />
                          {data.messages.map((m) => {
                            const idx = flat.indexOf(m);
                            return (
                              <ResultRow
                                key={`msg-${m.id}`}
                                active={activeIndex === idx}
                                onClick={() => navigate(m)}
                                onMouseEnter={() => setActiveIndex(idx)}
                              >
                                <span className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <MessageSquare size={10} className="text-violet-400" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  {/* Meta row */}
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {m.sender_name ?? "Unknown"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">in</span>
                                    <span className="text-[10px] font-medium text-blue-400 truncate flex items-center gap-0.5">
                                      {m.is_dm_channel ? <FaUser size={8} /> : <FaHashtag size={8} />}
                                      {m.channel_name ?? `channel ${m.channel_id}`}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                                      {timeAgo(m.created_at)}
                                    </span>
                                  </div>
                                  {/* Snippet */}
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {highlight(m.content, searchTerm)}
                                  </p>
                                </div>
                              </ResultRow>
                            );
                          })}
                        </section>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-[var(--border-color)] bg-muted/10 flex items-center gap-3">
                    <span><kbd className="font-mono px-1 rounded">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono px-1 rounded">↵</kbd> open</span>
                    <span><kbd className="font-mono px-1 rounded">Esc</kbd> close</span>
                    <span className="ml-auto opacity-50"># channels · @ people · plain = messages too</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE */}
          <button className="sm:hidden p-2 rounded-md" aria-label="search">
            <CiSearch size={22} />
          </button>

          {/* LOGO */}
          <div className="flex items-center sm:gap-2">
            <img src="/images/logo.png" alt="Logo" className="h-8 w-auto py-[6px] px-[10px] bg-white rounded-2xl" />
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
      {label}
    </p>
  );
}

function ResultRow({
  active,
  onClick,
  onMouseEnter,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/40"
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {children}
    </button>
  );
}