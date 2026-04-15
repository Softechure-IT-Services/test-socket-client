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
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

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

type MaybeId = string | number | null | undefined;

interface MessageResult {
  id: number;
  content: string;
  created_at: string;
  channel_id: number;
  thread_parent_id: MaybeId;
  thread_parent_message_id?: MaybeId;
  parent_message_id?: MaybeId;
  thread_id?: MaybeId;
  channel_name: string | null;
  is_dm_channel: boolean;
  sender_name: string | null;
  sender_avatar: string | null;
  kind: "message";
  is_thread_reply?: boolean;
}

type AnyResult = ChannelResult | PersonResult | MessageResult;

interface SearchData {
  channels: ChannelResult[];
  people: PersonResult[];
  messages: MessageResult[];
}

type SearchMode = "all" | "channel" | "people" | "context";

interface SearchScope {
  channelId: string;
  type: "channel" | "dm";
  label: string;
}

interface SearchIntent {
  mode: SearchMode;
  requestQuery: string;
  highlightQuery: string;
}

interface FocusNavSearchDetail {
  prefill?: string;
  channelId?: MaybeId;
  type?: "channel" | "dm";
  scopeLabel?: string;
}

interface NavHistory {
  stack: string[];
  index: number;
}

const EMPTY_SEARCH_DATA: SearchData = { channels: [], people: [], messages: [] };

function findBackTargetIndex(stack: string[], currentIndex: number, isLoginPath: (p: string) => boolean) {
  let idx = currentIndex - 1;
  while (idx >= 0) {
    if (!isLoginPath(stack[idx])) return idx;
    idx -= 1;
  }
  return -1;
}

function findForwardTargetIndex(stack: string[], currentIndex: number, isLoginPath: (p: string) => boolean) {
  let idx = currentIndex + 1;
  while (idx < stack.length) {
    if (!isLoginPath(stack[idx])) return idx;
    idx += 1;
  }
  return -1;
}

const isLoginPath = (p: string) => p === "/login" || p.startsWith("/login?");

// ─── Add this helper alongside the existing helpers ───────────────────────────
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")   // replace tags with a space
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")       // collapse multiple spaces
    .trim();
}

function normalizeId(id: MaybeId): string | null {
  if (id === null || id === undefined) return null;
  const str = String(id).trim();
  return str.length ? str : null;
}

type Threadish = {
  thread_parent_id?: MaybeId;
  thread_parent_message_id?: MaybeId;
  parent_message_id?: MaybeId;
  thread_id?: MaybeId;
  threadId?: MaybeId;
};

function resolveThreadParentId(result: Threadish): string | null {
  return (
    normalizeId(result.thread_parent_message_id) ??
    normalizeId(result.parent_message_id) ??
    // thread_parent_id is the *thread row id* (not the parent message id).
    // Only fall back to it if we have nothing else, to avoid building URLs
    // like ?threadId=<thread_id> which ChannelChat can't open.
    normalizeId(result.thread_parent_id) ??
    normalizeId(result.thread_id) ??
    normalizeId(result.threadId) ??
    null
  );
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

function parseSearchIntent(query: string, scope: SearchScope | null): SearchIntent {
  const trimmed = query.trim();

  if (scope) {
    const normalizedLabel = scope.label.trim().toLowerCase();
    const normalizedQuery = trimmed.toLowerCase();
    const scopedQuery =
      normalizedLabel && normalizedQuery.startsWith(normalizedLabel)
        ? trimmed.slice(scope.label.trim().length).trim()
        : trimmed;

    return {
      mode: "context",
      requestQuery: scopedQuery,
      highlightQuery: scopedQuery,
    };
  }

  if (query.startsWith("#")) {
    const stripped = query.slice(1).trim();
    return {
      mode: "channel",
      requestQuery: stripped,
      highlightQuery: stripped,
    };
  }

  if (query.startsWith("@")) {
    const stripped = query.slice(1).trim();
    return {
      mode: "people",
      requestQuery: stripped,
      highlightQuery: stripped,
    };
  }

  return {
    mode: "all",
    requestQuery: trimmed,
    highlightQuery: trimmed,
  };
}

function filterSearchData(
  data: SearchData,
  userId: MaybeId,
  mode: SearchMode,
  scope: SearchScope | null
): SearchData {
  const people = data.people.filter(
    (person) => String(person.id) !== String(userId)
  );

  if (scope) {
    return {
      channels: [],
      people: [],
      messages: data.messages.filter(
        (message) => String(message.channel_id) === scope.channelId
      ),
    };
  }

  if (mode === "channel") {
    return {
      channels: data.channels,
      people: [],
      messages: [],
    };
  }

  if (mode === "people") {
    return {
      channels: [],
      people,
      messages: [],
    };
  }

  return {
    ...data,
    people,
  };
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function AppNavbar() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navHistory = useRef<NavHistory>({ stack: [], index: -1 });
  const pendingHistoryIndex = useRef<number | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    if (!pathname) return;

    const history = navHistory.current;
    if (pendingHistoryIndex.current !== null) {
      history.index = pendingHistoryIndex.current;
      pendingHistoryIndex.current = null;
    } else {
      const nextStack = history.stack.slice(0, history.index + 1);
      nextStack.push(pathname);
      history.stack = nextStack;
      history.index = nextStack.length - 1;
    }

    setCanGoBack(findBackTargetIndex(history.stack, history.index, isLoginPath) !== -1);
    setCanGoForward(findForwardTargetIndex(history.stack, history.index, isLoginPath) !== -1);
  }, [pathname]);

  function handleBack() {
    if (!canGoBack) return;

    const history = navHistory.current;
    const targetIndex = findBackTargetIndex(history.stack, history.index, isLoginPath);
    if (targetIndex === -1) return;

    pendingHistoryIndex.current = targetIndex;
    router.push(history.stack[targetIndex]);
  }

  function handleForward() {
    if (!canGoForward) return;

    const history = navHistory.current;
    const targetIndex = findForwardTargetIndex(history.stack, history.index, isLoginPath);
    if (targetIndex === -1) return;

    pendingHistoryIndex.current = targetIndex;
    router.push(history.stack[targetIndex]);
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData>(EMPTY_SEARCH_DATA);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchScope, setSearchScope] = useState<SearchScope | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  const flat = flattenResults(data);
  const hasResults = flat.length > 0;
  const liveSearchIntent = parseSearchIntent(query, searchScope);
  const debouncedSearchIntent = parseSearchIntent(debouncedQuery, searchScope);
  const mode = liveSearchIntent.mode;
  const requestMode = debouncedSearchIntent.mode;
  const searchTerm = liveSearchIntent.highlightQuery;
  const effectiveQuery = debouncedSearchIntent.requestQuery;
  const modePill = searchScope
    ? {
        label: `In ${searchScope.label}`,
        className:
          searchScope.type === "dm"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-blue-500/15 text-blue-400",
      }
    : query && mode !== "all"
      ? {
          label: mode === "channel" ? "# Channels only" : "@ People only",
          className:
            mode === "channel"
              ? "bg-blue-500/15 text-blue-400"
              : "bg-emerald-500/15 text-emerald-400",
        }
      : null;

  function clearSearch() {
    setQuery("");
    setSearchScope(null);
    setData(EMPTY_SEARCH_DATA);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveQuery) {
      setData(EMPTY_SEARCH_DATA);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    axiosInstance
      .get<{ success: boolean; data: SearchData }>("/search", {
        params: {
          q: effectiveQuery,
          ...(searchScope ? { channelId: searchScope.channelId } : {}),
        },
      })
      .then(({ data: res }) => {
        if (!cancelled && res.success) {
          setData(filterSearchData(res.data, user?.id, requestMode, searchScope));
          setOpen(true);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY_SEARCH_DATA);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [effectiveQuery, requestMode, searchScope, user?.id]);

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
      const detail = (e as CustomEvent<FocusNavSearchDetail>).detail ?? {};
      const scopeChannelId = normalizeId(detail.channelId);
      const scopeLabel = detail.scopeLabel?.trim();
      const hasScope = !!(scopeChannelId && detail.type && scopeLabel);

      setData(EMPTY_SEARCH_DATA);
      setOpen(false);
      setActiveIndex(-1);

      if (hasScope) {
        setSearchScope({
          channelId: scopeChannelId!,
          type: detail.type!,
          label: scopeLabel!,
        });
        setQuery(detail.prefill ?? detail.scopeLabel ?? "");
      } else {
        setSearchScope(null);
        setQuery(detail.prefill ?? "");
      }

      // Small delay so state flushes before focus
      setTimeout(() => {
        inputRef.current?.focus();
        const len = hasScope
          ? (detail.prefill ?? detail.scopeLabel ?? "").length
          : (detail.prefill ?? "").length;
        inputRef.current?.setSelectionRange(len, len);
      }, 50);
    }
    window.addEventListener("focusNavSearch", onFocusNavSearch);
    return () => window.removeEventListener("focusNavSearch", onFocusNavSearch);
  }, []);

  // ── Navigate ─────────────────────────────────────────────────────────────────
  const navigate = useCallback(
    async (result: AnyResult) => {
      setOpen(false);
      setQuery("");
      setSearchScope(null);

      if (result.kind === "channel") {
        router.push(`/channel/${result.id}`);
      } else if (result.kind === "person") {
        if (result.dm_channel_id) {
          router.push(`/dm/${result.dm_channel_id}`);
        } else {
          // No existing DM — you can open a new DM compose flow
          try {
            const { data } = await axiosInstance.post(`/dm/with/${result.id}`);
            const createdDmId = normalizeId(data?.dm_id ?? data?.channel_id);
            if (createdDmId) {
              router.push(`/dm/${createdDmId}`);
            }
          } catch (error) {
            console.error("Failed to open DM from search:", error);
          }
        }
      } else if (result.kind === "message") {
        // Navigate to channel/dm, highlight the message via hash, open thread if applicable
        const baseRoute = result.is_dm_channel ? `/dm/${result.channel_id}` : `/channel/${result.channel_id}`;
        let url = `${baseRoute}?`;
        const threadParentId = resolveThreadParentId(result);
        if (result.is_thread_reply && threadParentId) {
          url += `threadId=${threadParentId}&scrollTo=${result.id}&v=${Date.now()}`;
        } else {
          url += `scrollTo=${result.id}&v=${Date.now()}`;
        }
        console.log('[SearchNav] Navigating to message result:', result, 'threadParentId:', threadParentId, 'url:', url, 'current location:', window.location.href);
        router.push(url);
        // if (threadParentId) {
        //   // Force a refresh so ChannelChat re-runs its thread auto-open effect even if we're already on this channel.
        //   router.refresh();
        // }
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
                  <button id="mobile-menu-btn" className="p-2 rounded-md hover:bg-accent flex items-center gap-1">
                    <FiMenu size={20} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile & Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Back / Forward */}
              <div className="flex items-center">
                <button
                  className="p-2 rounded-md transition-colors hover:bg-accent disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  aria-label="back"
                  onClick={handleBack}
                  disabled={!canGoBack}
                >
                  <FaArrowLeft size={16} />
                </button>
                <button
                  className="p-2 rounded-md transition-colors hover:bg-accent disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  aria-label="forward"
                  onClick={handleForward}
                  disabled={!canGoForward}
                >
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
                  className="w-full h-8 rounded-full pl-9 pr-8 text-sm outline-none border border-[var(--border-color)] focus:border-[var(--sidebar-foreground)] bg-transparent transition "
                  autoComplete="off"
                  spellCheck={false}
                />

                {(query || searchScope) && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    onClick={clearSearch}
                    tabIndex={-1}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Mode pill */}
              {/* {modePill && (
                <span className={`w-[max-content] absolute top-[50%] left-full text-[10px] font-semibold px-2 py-0.5 rounded-full ${modePill.className}`}>
                  {modePill.label}
                </span>
              )} */}

              {/* ── Dropdown ──────────────────────────────────────────────────── */}
              {open && (
                <div
                  ref={dropdownRef}
                  className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[480px] bg-[var(--sidebar)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[200] overflow-hidden"
                >
                  {/* No results */}
                  {!loading && !hasResults && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      <p className="text-base font-medium text-foreground mb-1">
                        {searchScope ? `No results in ${searchScope.label}` : "No results"}
                      </p>
                      <p>
                        {searchScope ? (
                          "Try a different message term."
                        ) : (
                          <>
                            Try a different search term or prefix with <code className="text-xs px-1 py-0.5 rounded">#</code> for channels or <code className="text-xs px-1 py-0.5 rounded">@</code> for people
                          </>
                        )}
                      </p>
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
                                {/* {c.is_private && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">private</span>
                                )} */}
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
                                {/* {p.dm_channel_id && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">DM</span>
                                )} */}
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
                            const threadParentId = resolveThreadParentId(m);
                            const isThreadReply = !!(m.is_thread_reply && threadParentId);
                            return (
                              <ResultRow
                                key={`msg-${m.id}`}
                                active={activeIndex === idx}
                                onClick={() => navigate(m)}
                                onMouseEnter={() => setActiveIndex(idx)}
                              >
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${isThreadReply ? "bg-indigo-500/15" : "bg-violet-500/15"}`}>
                                  <MessageSquare size={10} className={isThreadReply ? "text-indigo-400" : "text-violet-400"} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  {/* Meta row */}
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-semibold  truncate">
                                      {m.sender_name ?? "Unknown"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">in</span>
                                    <span className="text-[10px] font-medium text-blue-400 truncate flex items-center gap-0.5">
                                      {m.is_dm_channel ? <FaUser size={8} /> : <FaHashtag size={8} />}
                                      {m.channel_name ?? `channel ${m.channel_id}`}
                                    </span>
                                    {isThreadReply && (
                                      <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                                        <MessageSquare size={8} />
                                        Thread reply
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                                      {timeAgo(m.created_at)}
                                    </span>
                                  </div>
                                  {/* Snippet */}
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {highlight(stripHtml(m.content), searchTerm)}
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
        active ? "bg-accent" : "hover:bg-accent/40"
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {children}
    </button>
  );
}
