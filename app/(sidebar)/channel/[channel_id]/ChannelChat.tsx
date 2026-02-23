"use client";
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import MessageInput from "@/app/components/custom/MessageInput";
import ChatHover from "@/app/components/chat-hover";
import DOMPurify from "dompurify";
import FileBg from "@/app/components/ui/file-bg";
import FileUploadToggle from "@/app/components/ui/file-upload";
import Dateseparator from "@/app/components/ui/date";
import FileHover from "@/app/components/file-hover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { TbPinFilled } from "react-icons/tb";
import api from "@/lib/axios";
import CreateNew from "@/app/components/modals/CreateNew";
import { type Reaction as ChatHoverReaction } from "@/app/components/chat-hover";
import { useSearchParams, useRouter } from "next/navigation";
import ThreadPanel from "@/app/components/custom/ThreadPanel";
import { getLastRead, setLastRead } from "@/hooks/useLastRead";
import { useUnread } from "@/app/components/context/UnreadContext";

type User = {
  name: string;
};
type ReactionUser = {
  id: number | string;
  name: string;
};
type Reaction = { emoji: string; count: number; users?: ReactionUser[] };
type ChatFile = {
  id: number;
  url: string;
  name: string;
  type: string;
  size: number;
};
type Channel = {
  id: number | string;
  is_private: boolean;
  is_dm?: boolean;
};
type ForwardedFrom = {
  id: string | null;
  name: string | null;
  channel_id: number | null;
  channel_name?: string | null;
  channel_is_dm?: boolean;
};
type ChatMessage = {
  id?: number | string;
  sender_id: string;
  sender_name?: string;
  avatar_url?: string | null;
  content: string;
  files?: ChatFile[];
  self: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  reactions?: Reaction[];
  pinned?: boolean;
  is_forwarded?: boolean;
  forwarded_from?: ForwardedFrom | null;
  is_system?: boolean;
  thread_count?: number;
};
type ChannelChatProps = {
  channelId: string;
};

// ─── GIF header injection ─────────────────────────────────────────────────────
function injectGifHeaders(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(
    /<img([^>]*?)title="via GIPHY"([^>]*?)>/gi,
    (match, before, after) => {
      const altMatch = (before + after).match(/alt="([^"]*)"/i);
      const title = altMatch ? altMatch[1] : "GIF";
      const header =
        `<div style="display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,0.05);font-size:11px;color:#6b7280;margin-bottom:2px;">` +
        `<span style="flex-shrink:0;font-weight:700;font-size:10px;padding:1px 4px;border-radius:3px;background:#6366f1;color:#fff;line-height:1;">GIF</span>` +
        `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</span>` +
        `<span style="margin-left:auto;flex-shrink:0;opacity:0.5;font-size:10px;">via GIPHY</span>` +
        `</div>`;
      return `<div style="display:inline-flex;flex-direction:column;max-width:100%;">${header}${match}</div>`;
    }
  );
}

// ─── Memoized message content renderer ────────────────────────────────────────
const MessageContent = memo(
  ({
    html,
    className,
  }: {
    html: string | null | undefined;
    className?: string;
  }) => (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(injectGifHeaders(html ?? ""), {
          ADD_ATTR: ["style"],
        }),
      }}
    />
  ),
  (prev, next) => prev.html === next.html && prev.className === next.className
);
MessageContent.displayName = "MessageContent";

// ─── New message divider ───────────────────────────────────────────────────────
function NewMessageDivider() {
  return (
    <div className="flex items-center gap-2 px-6 py-1 select-none">
      <div className="flex-1 h-px bg-red-400/60" />
      <span className="text-[10px] font-bold tracking-widest text-red-500 uppercase px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 shrink-0">
        New
      </span>
      <div className="flex-1 h-px bg-red-400/60" />
    </div>
  );
}

// ─── System message component ──────────────────────────────────────────────────
function SystemMessage({
  content,
  created_at,
}: {
  content: string;
  created_at?: string | null;
}) {
  return (
    <div className="flex justify-center py-2 px-4">
      <div className="flex items-center gap-2 text-xs text-primary bg-muted/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full">
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(content),
          }}
        />
        {created_at && (
          <span className="opacity-60 whitespace-nowrap">
            {new Date(created_at).toLocaleString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Forwarded message card ────────────────────────────────────────────────────
function ForwardedCard({
  forwarded_from,
  content,
  userId,
  contentClassName,
}: {
  forwarded_from: ForwardedFrom | null | undefined;
  content: string;
  userId: string | undefined;
  contentClassName?: string;
}) {
  const senderLabel =
    forwarded_from?.id && String(forwarded_from.id) === String(userId)
      ? "you"
      : forwarded_from?.name ?? "unknown";

  const channelLabel = forwarded_from?.channel_name
    ? forwarded_from.channel_is_dm
      ? forwarded_from.channel_name
      : `#${forwarded_from.channel_name}`
    : null;

  return (
    <div className="border-l-2 border-blue-400 dark:border-blue-500 pl-3 pr-2 py-1.5 mt-0.5 rounded-r-md bg-blue-50/50 dark:bg-blue-950/20 max-w-full">
      <div className="flex items-start gap-1.5 mb-1 flex-wrap">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-400 shrink-0 mt-[2px]"
        >
          <polyline points="15 10 20 15 15 20" />
          <path d="M4 4v7a4 4 0 0 0 4 4h12" />
        </svg>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="text-[11px] text-blue-500 dark:text-blue-400 font-medium leading-none">
            Forwarded from{" "}
            <span className="font-bold">{senderLabel}</span>
          </span>
          {channelLabel && (
            <span className="text-[10px] text-blue-400/80 dark:text-blue-500/80 leading-none">
              {forwarded_from?.channel_is_dm
                ? "in a DM"
                : `in ${channelLabel}`}
            </span>
          )}
        </div>
      </div>
      <MessageContent
        html={content}
        className={`leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message text-[0.95em] opacity-90 ${contentClassName ?? ""}`}
      />
    </div>
  );
}

export default function ChannelChat({ channelId }: ChannelChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDm, setIsDm] = useState(false);
  const [dmOtherUser, setDmOtherUser] = useState<any>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [initialLoading, setInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [forwardMessageId, setForwardMessageId] = useState<string | null>(
    null
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Member status tracking ──────────────────────────────────────────────────
  const [isMember, setIsMember] = useState(true);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });

  const { socket, user, isOnline } = useAuth();
  const userId = user?.id;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [lockedId, setLockedId] = useState<string | number | null>(null);
  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.0.113:5000";

  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  const [dragging, setDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounter = useRef(0);
  const messageBoxRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const highlightedScrollIds = useRef<Set<string>>(new Set());

  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [newMessageSeparatorId, setNewMessageSeparatorId] = useState<string | null>(null);
  // lastRead ID captured at channel-open time, used to place the NEW divider
  const lastReadAtOpenRef = useRef<number | null>(null);

  const { incrementUnread, clearUnread } = useUnread();

  // ─── Thread panel state ──────────────────────────────────────────────────────
  const [threadMessage, setThreadMessage] = useState<{
    id: number | string;
    content: string;
    sender_name?: string;
    avatar_url?: string | null;
    created_at?: string | null;
  } | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    new Set()
  );
  const oldestMessageId = messages[0]?.id;
  const topMessageRef = useRef<HTMLDivElement | null>(null);

  const isFileDrag = (e: React.DragEvent) => {
    return Array.from(e.dataTransfer.types).includes("Files");
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e) || !isMember) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e) || !isMember) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e) || !isMember) return;
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    setDroppedFiles(files);
  };

  // ─── Fetch channel info + membership status ────────────────────────────────
  useEffect(() => {
    if (!channelId) return;
    setIsMember(true); // reset on channel change

    api
      .get(`/channels/${channelId}`)
      .then((res) => {
        const data = res.data;
        setChannel(data.channel);

        // Check membership status from server
        if (data.is_member !== undefined) {
          setIsMember(data.is_member);
        }

        if (data.channel?.is_dm) {
          setIsDm(true);
          setDmOtherUser(data.dm_user);
        } else {
          setIsDm(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 403) {
          setIsMember(false);
        }
      });
  }, [channelId]);

  // ─── Listen for removed/added from channel ──────────────────────────────────
  useEffect(() => {
    if (!socket || !channelId) return;

    const handleRemovedFromChannel = (data: {
      channelId: number;
      channelName?: string;
    }) => {
      if (String(data.channelId) === String(channelId)) {
        setIsMember(false);
      }
    };

    const handleAddedToChannel = (data: { channelId: number }) => {
      if (String(data.channelId) === String(channelId)) {
        setIsMember(true);
        // Re-join socket room
        socket.emit("joinChannel", { channel_id: Number(channelId) });
        // Reload messages
        loadMessages(true);
      }
    };

    // Listen for send errors (when trying to send after removal)
    const handleMessageSendError = (data: {
      channel_id: number;
      error: string;
    }) => {
      if (String(data.channel_id) === String(channelId)) {
        setIsMember(false);
        // Remove optimistic temp messages
        setMessages((prev) =>
          prev.filter((m) => !m.id?.toString().startsWith("temp-"))
        );
      }
    };

    socket.on("removedFromChannel", handleRemovedFromChannel);
    socket.on("addedToChannel", handleAddedToChannel);
    socket.on("messageSendError", handleMessageSendError);

    return () => {
      socket.off("removedFromChannel", handleRemovedFromChannel);
      socket.off("addedToChannel", handleAddedToChannel);
      socket.off("messageSendError", handleMessageSendError);
    };
  }, [socket, channelId]);

  useEffect(() => {
    const scrollToId = searchParams?.get("scrollTo");
    if (!scrollToId || messages.length === 0 || initialLoading) return;

    if (highlightedScrollIds.current.has(scrollToId)) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${scrollToId}`);
      if (!el) return;

      highlightedScrollIds.current.add(scrollToId);

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      el.style.transition = "none";
      el.style.backgroundColor = "#fef08a";
      el.style.borderRadius = "6px";
      el.style.outline = "2px solid #facc15";

      setTimeout(() => {
        el.style.transition = "background-color 1s ease, outline 1s ease";
        el.style.backgroundColor = "";
        el.style.outline = "2px solid transparent";
        setTimeout(() => {
          el.style.transition = "";
          el.style.outline = "";
          el.style.borderRadius = "";
        }, 1000);
      }, 1800);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, messages, initialLoading]);

  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("joinChannel", { channel_id: Number(channelId) });

    return () => {
      if (socket) {
        socket.emit("leaveChannel", { channel_id: Number(channelId) });
      }
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;

    const handleDelete = ({ id }: any) => {
      setMessages((prev) =>
        prev.filter((m) => String(m.id) !== String(id))
      );
    };

    socket.on("messageDeleted", handleDelete);

    return () => {
      socket.off("messageDeleted", handleDelete);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleReceive = (msg: any) => {
      if (String(msg.channel_id) !== String(channelId)) return;

      const stableId =
        msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;

      const chatMsg: ChatMessage = {
        id: stableId,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        content: msg.content,
        files: Array.isArray(msg.files) ? msg.files : [],
        self: String(msg.sender_id) === String(userId),
        created_at: msg.created_at ?? new Date().toISOString(),
        avatar_url: msg.avatar_url ?? null,
        is_forwarded: msg.is_forwarded ?? false,
        forwarded_from: msg.forwarded_from ?? null,
        is_system: msg.is_system ?? false,
      };

      setMessages((prev) => {
        const tempIdx = prev.findIndex(
          (m) =>
            m.self &&
            m.id?.toString().startsWith("temp-") &&
            m.content === chatMsg.content
        );

        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = chatMsg;
          return next;
        }

        if (prev.some((m) => String(m.id) === String(chatMsg.id)))
          return prev;

        const next = [...prev, chatMsg].sort(
          (a, b) =>
            new Date(a.created_at!).getTime() -
            new Date(b.created_at!).getTime()
        );

        return next;
      });

      // Side-effects outside setMessages to avoid double-fire in React Strict Mode
      if (!shouldAutoScrollRef.current && !chatMsg.self) {
        // User is scrolled up — show the floating banner + NEW divider
        setHasNewMessages(true);
        setNewMessageCount((c) => c + 1);
        setNewMessageSeparatorId((prev) => prev ?? String(chatMsg.id));
        setHighlightedIds((prevSet) => {
          const copy = new Set(prevSet);
          copy.add(String(chatMsg.id));
          return copy;
        });
      } else if (!chatMsg.self && chatMsg.id != null) {
        // User is at the bottom reading — mark as read right away
        setLastRead(channelId, chatMsg.id);
      }
    };

    const handleAck = (msg: any) => {
      const stableId =
        msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;
      const createdAt = msg.created_at ?? new Date().toISOString();
      const chatMsg: ChatMessage = {
        id: stableId,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        content: msg.content,
        files: Array.isArray(msg.files) ? msg.files : [],
        self: true,
        created_at: createdAt,
        avatar_url: user?.avatar_url ?? null,
        pinned: msg.pinned ?? false,
        is_forwarded: msg.is_forwarded ?? false,
        forwarded_from: msg.forwarded_from ?? null,
        is_system: msg.is_system ?? false,
      };
      setMessages((prev) => {
        const tempIdx = prev.findIndex(
          (m) =>
            m.self &&
            m.id?.toString().startsWith("temp-") &&
            m.content === chatMsg.content
        );
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = chatMsg;
          return next;
        }
        if (prev.some((m) => String(m.id) === String(chatMsg.id)))
          return prev;
        return [...prev, chatMsg].sort((a, b) => {
          const ta = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;
          const tb = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;
          return ta - tb;
        });
      });
    };

    const handleReactionsUpdate = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (String(msg.id) !== String(messageId)) return msg;
          const existingReactions = msg.reactions ?? [];
          const merged = (reactions as any[]).map((serverR: any) => {
            const existing = existingReactions.find(
              (r) => r.emoji === serverR.emoji
            );
            return {
              ...serverR,
              users:
                Array.isArray(serverR.users) && serverR.users.length > 0
                  ? serverR.users
                  : Array.isArray(existing?.users)
                    ? existing.users
                    : [],
            };
          });
          return { ...msg, reactions: merged };
        })
      );
    };

    const handleMessageEdited = (msg: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(msg.id)
            ? {
                ...m,
                content: msg.content,
                updated_at: msg.updated_at ?? m.updated_at,
              }
            : m
        )
      );
    };

    const handleThreadReply = (data: any) => {
      // Update thread_count on the parent message in the chat
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(data.parent_message_id)
            ? { ...m, thread_count: data.reply_count }
            : m
        )
      );
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("messageAck", handleAck);
    socket.on("reactionUpdated", handleReactionsUpdate);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("threadReplyAdded", handleThreadReply);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("messageAck", handleAck);
      socket.off("reactionUpdated", handleReactionsUpdate);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("threadReplyAdded", handleThreadReply);
    };
  }, [socket, userId, channelId]);

  const loadMessages = useCallback(
    async (initial = false) => {
      if (!channelId || !userId) return;

      if (!initial) {
        if (loadingMoreRef.current) return;
        if (!hasMore) return;
        loadingMoreRef.current = true;
      }

      const el = containerRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;

      if (initial) {
        setInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await api.get(`/channels/${channelId}/messages`, {
          params: {
            limit: 16,
            cursor: initial ? null : messages[0]?.id ?? null,
          },
        });

        const data = res.data;

        const mapped: ChatMessage[] = res.data.messages.map((msg: any) => ({
          id: msg.id,
          sender_id: String(msg.sender_id),
          sender_name: msg.sender_name,
          content: msg.content,
          files: msg.files ? JSON.parse(msg.files) : [],
          self: String(msg.sender_id) === String(userId),
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          reactions: msg.reactions ? JSON.parse(msg.reactions) : [],
          avatar_url: msg.avatar_url ?? null,
          pinned: msg.pinned === true,
          is_forwarded: msg.is_forwarded ?? false,
          forwarded_from: msg.forwarded_from ?? null,
          is_system: msg.is_system ?? false,
          thread_count: msg.thread_count ?? 0,
        }));

        setMessages((prev) => (initial ? mapped : [...mapped, ...prev]));

        const newCursor = data.nextCursor ?? null;

        if (!mapped.length || newCursor == null) {
          setHasMore(false);
        } else {
          setHasMore(true);
          setNextCursor(newCursor);
        }

        if (!initial && el) {
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = newScrollHeight - prevScrollHeight;
          });
        }
      } catch (err: any) {
        console.error("Failed to load messages:", err);
        if (err.response?.status === 403) {
          setIsMember(false);
        }
      } finally {
        if (initial) {
          setInitialLoading(false);
        } else {
          setIsLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [channelId, userId, hasMore, nextCursor]
  );

  const loadMessagesAroundId = useCallback(
    async (targetId: string) => {
      if (!channelId || !userId) return;
      setInitialLoading(true);
      try {
        const cursorAbove = Number(targetId) + 1;
        const res = await api.get(`/channels/${channelId}/messages`, {
          params: { limit: 30, cursor: cursorAbove },
        });
        const mapped: ChatMessage[] = res.data.messages.map((msg: any) => ({
          id: msg.id,
          sender_id: String(msg.sender_id),
          sender_name: msg.sender_name,
          content: msg.content,
          files: msg.files ? JSON.parse(msg.files) : [],
          self: String(msg.sender_id) === String(userId),
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          reactions: msg.reactions ? JSON.parse(msg.reactions) : [],
          avatar_url: msg.avatar_url ?? null,
          pinned: msg.pinned === true,
          is_forwarded: msg.is_forwarded ?? false,
          forwarded_from: msg.forwarded_from ?? null,
          is_system: msg.is_system ?? false,
        }));
        setMessages(mapped);
        setNextCursor(res.data.nextCursor ?? null);
        setHasMore(!!res.data.nextCursor);
      } catch (err) {
        console.error("Failed to load messages around id:", err);
        loadMessages(true);
      } finally {
        setInitialLoading(false);
      }
    },
    [channelId, userId]
  );

  useEffect(() => {
    if (!channelId || !userId) return;
    didInitialScrollRef.current = false;

    // Capture lastRead BEFORE resetting — used by after-load effect for NEW divider
    lastReadAtOpenRef.current = getLastRead(channelId);

    // Clear unread badge for this channel now that user has opened it
    clearUnread(channelId);

    setMessages([]);
    setNextCursor(null);
    setHasMore(true);
    setHasNewMessages(false);
    setNewMessageCount(0);
    setNewMessageSeparatorId(null);
    setHighlightedIds(new Set());
    highlightedScrollIds.current.clear();

    const scrollToId = searchParams?.get("scrollTo");
    if (scrollToId) {
      loadMessagesAroundId(scrollToId);
    } else {
      loadMessages(true);
    }
  }, [channelId, userId]);

  useEffect(() => {
    if (!initialLoading) return;

    const el = containerRef.current;
    if (!el) return;

    const scrollToId = searchParams?.get("scrollTo");
    if (scrollToId) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      didInitialScrollRef.current = true;
    });
  }, [initialLoading]);

  // ─── After initial load: place NEW divider + save lastRead ────────────────────
  // Uses a ref to detect the true→false transition of initialLoading.
  const prevInitialLoadingRef = useRef(false);
  useEffect(() => {
    if (initialLoading) {
      prevInitialLoadingRef.current = true;
      return;
    }
    if (!prevInitialLoadingRef.current) return; // wasn't loading — skip
    prevInitialLoadingRef.current = false;
    if (messages.length === 0) return;

    const lastReadId = lastReadAtOpenRef.current;

    // Place the NEW divider at the first unread message (newer than lastRead)
    if (lastReadId !== null) {
      const firstUnread = messages.find(
        (m) => !m.self && m.id != null && Number(m.id) > lastReadId
      );
      if (firstUnread) {
        setNewMessageSeparatorId(String(firstUnread.id));
      }
    }

    // Save the newest message as lastRead — but ONLY for messages that are
    // at/before the current last message. New socket messages will update this
    // further. This marks "I've seen everything up to now" without blocking
    // future new messages from showing as unread.
    const newestId = messages.reduce((max, m) => {
      const n = Number(m.id);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    if (newestId > 0) {
      setLastRead(channelId, newestId);
    }
  }, [initialLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;

    const handlePinnedUpdate = ({ messageId, pinned }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(messageId)
            ? { ...msg, pinned }
            : msg
        )
      );
    };

    socket.on("messagePinned", handlePinnedUpdate);
    socket.on("messageUnpinned", handlePinnedUpdate);

    return () => {
      socket.off("messagePinned", handlePinnedUpdate);
      socket.off("messageUnpinned", handlePinnedUpdate);
    };
  }, [socket]);

  const shouldAutoScrollRef = useRef(true);

  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (isLoadingMore) return;
    if (!shouldAutoScrollRef.current) return;

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMessageId]);

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleShare = async (file: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          url: file.url,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(file.url);
      alert("Link copied to clipboard");
    }
  };

  useEffect(() => {
    if (!topMessageRef.current || !containerRef.current) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore && !initialLoading) {
          loadMessages(false);
        }
      },
      {
        root: containerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(topMessageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, initialLoading, loadMessages]);

  function MessageSkeleton() {
    return (
      <div className="flex gap-3 px-6 py-2 animate-pulse">
        <div className="w-8 h-8 rounded bg-gray-300" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-gray-300 rounded" />
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const handleSendMessage = async (content: string, files?: any[]) => {
    if (!socket || !socket.connected) return;
    if (!isMember) return;

    let fileMetadata: any[] = [];

    if (files && files.length > 0) {
      const first = files[0];
      const isMetadata = first && (first.url || first.path);

      if (isMetadata) {
        fileMetadata = files;
      } else {
        const formData = new FormData();
        files.forEach((f: File) => formData.append("files", f));
        const res = await api.post(`${SERVER_URL}/upload`, formData);
        fileMetadata = Array.isArray(res.data.files)
          ? res.data.files
          : [];
      }
    }

    const tempId = `temp-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender_id: userId!,
      sender_name: user?.name,
      avatar_url: user?.avatar_url ?? null,
      content,
      files: fileMetadata,
      self: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    socket.emit("sendMessage", {
      content,
      channel_id: Number(channelId),
      files: fileMetadata,
    });
  };

  function pinMessage(messageId: string | number) {
    if (!socket || !isMember) return;
    socket.emit("pinMessage", {
      messageId,
      channel_id: Number(channelId),
    });
  }

  function shouldShowDateSeparator(messages: any[], index: number) {
    if (index === 0) return true;
    const currentDate = new Date(
      messages[index].created_at
    ).toDateString();
    const previousDate = new Date(
      messages[index - 1].created_at
    ).toDateString();
    return currentDate !== previousDate;
  }

  function unpinMessage(messageId: string | number) {
    if (!socket || !isMember) return;
    socket.emit("unpinMessage", {
      messageId,
      channel_id: Number(channelId),
    });
  }

  function enableEditMode(messageId: string | number) {
    if (!isMember) return;
    const msg = messages.find(
      (m) => String(m.id) === String(messageId)
    );
    if (!msg) return;
    setEditMessageId(String(messageId));
    setEditContent(msg.content);
  }

  function handleCancelEdit() {
    setEditMessageId(null);
    setEditContent("");
  }

  function handleSaveEdit(
    messageId: string,
    newContent: string,
    files?: File[]
  ) {
    if (!isMember) return;

    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId)
          ? {
              ...m,
              content: newContent,
              updated_at: new Date().toISOString(),
            }
          : m
      )
    );

    if (socket && socket.connected) {
      socket.emit("editMessage", {
        messageId,
        content: newContent,
        channel_id: Number(channelId),
      });
    }

    setEditMessageId(null);
    setEditContent("");
  }

  function addEmojiToMessage(messageId: string | number, emoji: any) {
    if (!socket || !userId || !isMember) return;

    const selectedEmoji =
      emoji.native ?? emoji.colons ?? String(emoji);

    setMessages((prev) =>
      prev.map((msg) => {
        if (String(msg.id) !== String(messageId)) return msg;

        const reactions = msg.reactions
          ? msg.reactions.map((r) => ({
              ...r,
              users: Array.isArray(r.users) ? r.users : [],
            }))
          : [];

        const existing = reactions.find(
          (r) => r.emoji === selectedEmoji
        );

        if (existing) {
          if (
            existing.users &&
            !existing.users.some(
              (u) => String(u.id) === String(userId)
            )
          ) {
            existing.users.push({
              id: userId,
              name: user?.name ?? "You",
            });
            existing.count = existing.users.length;
          }
        } else {
          reactions.push({
            emoji: selectedEmoji,
            count: 1,
            users: [
              {
                id: userId,
                name: user?.name ?? "You",
              },
            ],
          });
        }

        return { ...msg, reactions };
      })
    );

    try {
      socket.emit("reactMessage", {
        messageId,
        emoji: selectedEmoji,
      });
    } catch (err) {
      console.error("Failed to emit reactMessage", err);
    }
  }

  function toggleReaction(
    messageId: string | number,
    emoji: string
  ) {
    if (!socket || !userId || !isMember) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (String(msg.id) !== String(messageId)) return msg;

        const reactions = (msg.reactions ?? []).map((r) => ({
          ...r,
          users: Array.isArray(r.users) ? r.users : [],
        }));

        const existing = reactions.find((r) => r.emoji === emoji);

        if (existing) {
          const alreadyReacted = existing.users.some(
            (u) => String(u.id) === String(userId)
          );
          if (alreadyReacted) {
            existing.users = existing.users.filter(
              (u) => String(u.id) !== String(userId)
            );
            existing.count = existing.users.length;
          } else {
            existing.users.push({
              id: userId,
              name: user?.name ?? "You",
            });
            existing.count = existing.users.length;
          }
          return {
            ...msg,
            reactions: reactions.filter((r) => r.count > 0),
          };
        } else {
          reactions.push({
            emoji,
            count: 1,
            users: [{ id: userId, name: user?.name ?? "You" }],
          });
          return { ...msg, reactions };
        }
      })
    );

    socket.emit("reactMessage", { messageId, emoji });
  }

  function handleChatAction(action: string, messageId: string) {
    const msg = messages.find(
      (m) => String(m.id) === String(messageId)
    );

    if (action.startsWith("react:")) {
      const emoji = action.slice(6);
      addEmojiToMessage(messageId, { native: emoji });
      return;
    }

    switch (action) {
      case "reaction":
        break;
      case "reply": {
        const replyMsg = messages.find((m) => String(m.id) === String(messageId));
        if (replyMsg) {
          setThreadMessage({
            id: replyMsg.id!,
            content: replyMsg.content,
            sender_name: replyMsg.sender_name,
            avatar_url: replyMsg.avatar_url,
            created_at: replyMsg.created_at,
          });
        }
        break;
      }
      case "pin":
        if (!msg) return;
        if (msg.pinned) unpinMessage(messageId);
        else pinMessage(messageId);
        break;
      case "forward":
        setForwardMessageId(messageId);
        break;
      case "edit":
        enableEditMode(messageId);
        break;
      case "delete":
        deleteMessage(messageId);
        break;
      default:
        break;
    }
  }

  function deleteMessage(messageId: string) {
    if (!confirm("Delete this message?")) return;
    if (!socket || !isMember) return;
    socket.emit("deleteMessage", { id: messageId });
    setMessages((prev) =>
      prev.filter((m) => String(m.id) !== String(messageId))
    );
  }

  useEffect(() => {
    if (!messageBoxRef.current) return;
    const el = messageBoxRef.current;
    const ro = new ResizeObserver(() => {});
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
    if (shouldAutoScrollRef.current && hasNewMessages) {
      setHasNewMessages(false);
      setNewMessageCount(0);
      // Keep newMessageSeparatorId — the NEW divider stays until channel navigation
      setHighlightedIds(new Set());
      // Mark everything as read now that user scrolled to bottom
      const newestId = messages.reduce((max, m) => {
        const n = Number(m.id);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      if (newestId > 0) setLastRead(channelId, newestId);
    }
  };

  useEffect(() => {
    if (highlightedIds.size === 0) return;
    const t = setTimeout(() => {
      setHighlightedIds(new Set());
    }, 3000);
    return () => clearTimeout(t);
  }, [highlightedIds]);

  return (
    <div
      className="flex min-h-[100%] dark:bg-black"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Thread panel — 1/3 width, slides in from the right */}
      {threadMessage && (
        <div className="hidden md:flex md:w-[340px] lg:w-[380px] xl:w-[420px] shrink-0 flex-col h-[calc(100vh-var(--main-header-height)-var(--chat-header-height)+33px)] sticky top-0 order-2 animate-in slide-in-from-right duration-200">
          <ThreadPanel
            parentMessage={threadMessage}
            onClose={() => setThreadMessage(null)}
            onReplyCountChange={(msgId, count) => {
              setMessages((prev) =>
                prev.map((m) =>
                  String(m.id) === String(msgId) ? { ...m, thread_count: count } : m
                )
              );
            }}
          />
        </div>
      )}
      {dragging && isMember && (
        <div className="fixed top-0 left-0 w-full h-[100%] bg-black bg-opacity-50 flex items-center justify-center z-500 transition-opacity duration-300">
          <FileBg />
        </div>
      )}
      <main
        className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-var(--main-header-height)-var(--chat-header-height)+33px)] order-1"
        onScroll={handleScroll}
        ref={containerRef}
      >
        {hasNewMessages && isMember && (
          <div className="sticky top-2 z-50 flex justify-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full shadow-lg text-sm flex items-center gap-2 transition-colors"
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setHasNewMessages(false);
                setNewMessageCount(0);
                // Do NOT clear newMessageSeparatorId — NEW divider stays until nav
                setHighlightedIds(new Set());
              }}
            >
              <span>
                {newMessageCount > 0
                  ? `${newMessageCount} new message${newMessageCount === 1 ? "" : "s"}`
                  : "New messages"}{" "}
                ↓
              </span>
            </button>
          </div>
        )}

        <div
          className="flex-1 pt-[60px] pb-[10px] bg-[var(--chat_bg)] px-0"
          style={{ scrollbarGutter: "stable" }}
        >
          {initialLoading && (
            <>
              <MessageSkeleton />
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          )}

          {!initialLoading && isLoadingMore && (
            <div className="mb-2">
              <MessageSkeleton />
              <MessageSkeleton />
            </div>
          )}

          {messages?.map((msg, index) => {
            const msgId = String(msg.id);
            const isHighlighted = highlightedIds.has(msgId);
            const isNewSeparator = newMessageSeparatorId && msgId === newMessageSeparatorId;

            // ─── Render system messages differently ────────────────────
            if (msg.is_system) {
              return (
                <div
                  key={msgId}
                  id={`msg-${msgId}`}
                  ref={index === 0 ? topMessageRef : null}
                >
                  {isNewSeparator && <NewMessageDivider />}
                  {shouldShowDateSeparator(messages, index) && (
                    <Dateseparator date={msg.created_at} />
                  )}
                  <SystemMessage
                    content={msg.content}
                    created_at={msg.created_at}
                  />
                </div>
              );
            }

            const prev = messages[index - 1];
            const showAvatar =
              !prev ||
              prev.sender_id !== msg.sender_id ||
              prev.is_system ||
              shouldShowDateSeparator(messages, index);

            return (
              <div key={msgId}>
                {isNewSeparator && <NewMessageDivider />}
              <div
                id={`msg-${msgId}`}
                ref={index === 0 ? topMessageRef : null}
                className={`py-0 relative flex justify-start group/message !px-[25px] items-center gap-3 
                  ${msg.pinned ? "pinned bg-amber-100" : "hover:bg-[var(--sidebar-accent)]"}
                  ${isHighlighted ? "bg-red-200 animate-pulse" : ""}
                  ${shouldShowDateSeparator(messages, index) && "border-t"}`}
                onMouseEnter={() => {
                  if (!lockedId && isMember) setHoveredId(msgId);
                }}
                onMouseLeave={() => {
                  if (lockedId !== msgId) setHoveredId(null);
                }}
              >
                {msg.pinned && (
                  <span className="absolute top-0 right-0 text-blue-500 text-sm">
                    <TbPinFilled
                      size={20}
                      className="text-amber-400"
                    />
                  </span>
                )}
                <div
                  className={`py-1 rounded-xl items-start flex flex-col gap-0 relative w-full min-w-0 ${showAvatar ? "pt-1 pb-1" : ""}`}
                >
                  {showAvatar && (
                    <div className="grid grid-cols-1 md:grid-cols-[max-content_minmax(0,1fr)] grid-rows-2 gap-x-2 min-w-0 top_most_message">
                      <img
                        src={
                          msg.avatar_url != null
                            ? `/avatar/${msg.avatar_url}`
                            : "/avatar/fallback.webp"
                        }
                        alt="avatar"
                        className="w-8 h-8 rounded-sm object-cover shrink-0 row-span-2 aspect-square"
                      />
                      <div className="flex flex-row gap-1 items-center h-fit">
                        {msg.sender_name && (
                          <span className="text-sm font-bold self-center">
                            {msg.sender_name}
                          </span>
                        )}
                        {msg.sender_name && (
                          <div className="flex items-center gap-2">
                            {msg.created_at && (
                              <span className="text-[10px] opacity-60 whitespace-nowrap">
                                {new Date(
                                  msg.created_at
                                ).toLocaleString("en-US", {
                                  hour: "numeric",
                                  minute: "numeric",
                                  hour12: true,
                                })}
                                {msg.updated_at &&
                                  msg.updated_at !==
                                    msg.created_at && (
                                    <span className="italic text-[10px] ml-1 line">
                                      (edited)
                                    </span>
                                  )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.is_forwarded ? (
                        <ForwardedCard
                          forwarded_from={msg.forwarded_from}
                          content={msg.content}
                          userId={userId}
                        />
                      ) : (
                        <MessageContent
                          html={msg.content}
                          className="leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message"
                        />
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <div
                      className={`rounded-md ms-[40px] w-fit flex flex-col ${msg.reactions && msg.reactions.length > 0 ? "mb-2" : ""}`}
                    >
                      {!showAvatar && msg.is_forwarded ? (
                        <ForwardedCard
                          forwarded_from={msg.forwarded_from}
                          content={msg.content}
                          userId={userId}
                        />
                      ) : (
                        <MessageContent
                          html={msg.content}
                          className={`leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message ${showAvatar ? "hidden" : ""}`}
                        />
                      )}
                      {msg.files?.length ? (
                        <div className="flex gap-2">
                          {msg.files.map((file, i) => (
                            <div
                              key={i}
                              className="flex flex-col gap-1"
                            >
                              <div className="flex items-center gap-2 px-1 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 max-w-[400px]">
                                {file.type === "image/gif" && (
                                  <span className="shrink-0 font-bold text-[10px] px-1 py-0.5 rounded bg-indigo-500 text-white leading-none">
                                    GIF
                                  </span>
                                )}
                                <span className="font-medium truncate">
                                  {file.name}
                                </span>
                                <span className="shrink-0 opacity-60 ml-auto">
                                  {file.size < 1024
                                    ? `${file.size} B`
                                    : file.size < 1024 * 1024
                                      ? `${(file.size / 1024).toFixed(1)} KB`
                                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                                </span>
                              </div>
                              <div className="group relative aspect-square max-h-[400px] max-w-[400px] h-full w-full min-h-[200px] min-w-[200px] rounded">
                                <FileHover
                                  fileId={msgId}
                                  onAction={(action) => {
                                    if (action === "download") {
                                      handleDownload(file);
                                    }
                                    if (action === "share") {
                                      setForwardMessageId(msgId);
                                    }
                                  }}
                                />
                                {file.type.startsWith("image/") ? (
                                  <img
                                    src={file.url}
                                    className="w-full rounded border object-cover h-full"
                                  />
                                ) : (
                                  <div className="p-2 border rounded text-sm h-full flex items-center justify-center">
                                    📎 {file.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {msg.reactions &&
                        msg.reactions.length > 0 && (
                          <div className="flex gap-1 flex-wrap whitespace-nowrap mt-1 w-fit">
                            {msg.reactions.map((r, idx) => {
                              const currentUserReacted = (
                                r.users ?? []
                              ).some(
                                (u) =>
                                  String(u.id) ===
                                  String(userId)
                              );
                              const tooltipUsers = [
                                ...(r.users ?? [])
                                  .filter(
                                    (u) =>
                                      String(u.id) ===
                                      String(userId)
                                  )
                                  .map(() => "You"),
                                ...(r.users ?? [])
                                  .filter(
                                    (u) =>
                                      String(u.id) !==
                                      String(userId)
                                  )
                                  .map((u) => u.name),
                              ];
                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <span
                                      onClick={() => {
                                        if (
                                          msg.id == null ||
                                          !isMember
                                        )
                                          return;
                                        toggleReaction(
                                          msg.id,
                                          r.emoji
                                        );
                                      }}
                                      className={`text-sm px-2 leading-none py-1 rounded-full flex items-center gap-1 select-none transition-colors ${
                                        isMember
                                          ? "cursor-pointer"
                                          : "cursor-default opacity-60"
                                      } ${
                                        currentUserReacted
                                          ? "bg-blue-100 border border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300"
                                          : "bg-gray-200 border border-transparent hover:border-gray-400 dark:bg-zinc-700 dark:text-gray-200"
                                      }`}
                                    >
                                      {r.emoji}{" "}
                                      {r.count <= 1
                                        ? ""
                                        : r.count}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black text-white p-2 text-xs rounded-md flex flex-col gap-1 min-w-[80px]">
                                    <p className="font-semibold border-b border-white/20 pb-1 mb-0.5">
                                      {r.emoji}{" "}
                                      {r.count === 1
                                        ? "1 person"
                                        : `${r.count} people`}
                                    </p>
                                    {tooltipUsers.length > 0 ? (
                                      tooltipUsers.map(
                                        (name, j) => (
                                          <span
                                            key={j}
                                            className={`truncate max-w-[140px] ${name === "You" ? "font-semibold text-blue-300" : ""}`}
                                          >
                                            {name}
                                          </span>
                                        )
                                      )
                                    ) : (
                                      <span className="opacity-60 italic">
                                        reacted
                                      </span>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      {!showAvatar &&
                        msg.updated_at &&
                        msg.updated_at !== msg.created_at && (
                          <span className="inline text-[10px] italic opacity-60 whitespace-nowrap">
                            (edited)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* ── Thread reply count pill ── */}
                  {(msg.thread_count ?? 0) > 0 && (
                    <button
                      onClick={() => {
                        setThreadMessage({
                          id: msg.id!,
                          content: msg.content,
                          sender_name: msg.sender_name,
                          avatar_url: msg.avatar_url,
                          created_at: msg.created_at,
                        });
                      }}
                      className="flex items-center gap-1.5 mt-0.5 ml-10 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-md transition-colors group/thread cursor-pointer w-fit"
                    >
                      <div className="flex -space-x-1">
                        {/* small avatar stack placeholder */}
                        <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 border border-white dark:border-zinc-900" />
                      </div>
                      <span className="font-semibold">
                        {msg.thread_count} {(msg.thread_count ?? 0) === 1 ? "reply" : "replies"}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover/thread:opacity-100 transition-opacity text-[11px]">
                        View thread →
                      </span>
                    </button>
                  )}

                  {!showAvatar && msg.created_at && (
                    <div className="text-[10px] top-[calc(calc(var(--spacing)*1)+0.5rem)] left-0 -translate-x-[0.5rem] opacity-60 absolute flex-col hidden group-hover/message:block whitespace-nowrap flex items-center gap-0">
                      {new Date(msg.created_at).toLocaleString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* Only show ChatHover if user is still a member */}
                {isMember &&
                  (lockedId
                    ? lockedId === msgId
                    : hoveredId === msgId) && (
                    <ChatHover
                      messageId={msgId}
                      pinned={msg.pinned}
                      isSelf={msg.self}
                      reactions={
                        (msg.reactions ??
                          []) as ChatHoverReaction[]
                      }
                      currentUserId={userId}
                      onAction={handleChatAction}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          setLockedId(msgId);
                        } else {
                          setLockedId(null);
                          setHoveredId((prev) =>
                            prev === msgId ? null : prev
                          );
                        }
                      }}
                    />
                  )}

                {shouldShowDateSeparator(messages, index) && (
                  <Dateseparator date={msg.created_at} />
                )}
              </div>
              </div>
            );
          })}
        </div>

        {/* ─── Message input area ─────────────────────────────────── */}
        <div
          className="pb-2 px-[25px] pt-0 relative sticky bottom-0 right-0 bg-[var(--chat_bg)] dark:bg-zinc-900"
          ref={messageBoxRef}
        >
          {isMember ? (
            <>
              <div>
                <FileUploadToggle />
              </div>
              <MessageInput
                onSend={handleSendMessage}
                editingMessageId={editMessageId}
                editingInitialContent={editContent}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                dropFiles={droppedFiles}
                onDropFilesConsumed={() => setDroppedFiles([])}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-4 px-6 bg-muted/50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-muted-foreground/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line
                    x1="4.93"
                    y1="4.93"
                    x2="19.07"
                    y2="19.07"
                  />
                </svg>
                <span>
                  You have been removed from this channel and
                  cannot send messages.
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
        <CreateNew
          open={!!forwardMessageId}
          onClose={() => setForwardMessageId(null)}
          type="forward"
          forwardMessageId={forwardMessageId}
        />
      </main>
    </div>
  );
}