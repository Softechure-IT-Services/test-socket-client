"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import MessageInput from "@/app/components/custom/MessageInput";
import DOMPurify from "dompurify";
import api from "@/lib/axios";
import { X, MessageSquare } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadReply = {
  id: number | string;
  content: string;
  created_at: string;
  updated_at?: string;
  sender_id: string | number;
  sender_name: string;
  avatar_url?: string | null;
};

type ParentMessage = {
  id: number | string;
  content: string;
  sender_name?: string;
  avatar_url?: string | null;
  created_at?: string | null;
};

type ThreadPanelProps = {
  parentMessage: ParentMessage | null;
  onClose: () => void;
  /** Callback so ChannelChat can update the thread_count badge live */
  onReplyCountChange?: (messageId: string | number, count: number) => void;
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(replies: ThreadReply[]) {
  const groups: { date: string; items: ThreadReply[] }[] = [];
  for (const reply of replies) {
    const dateKey = new Date(reply.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.items.push(reply);
    } else {
      groups.push({ date: dateKey, items: [reply] });
    }
  }
  return groups;
}

// ─── Reply bubble ─────────────────────────────────────────────────────────────

function ReplyBubble({
  reply,
  isSelf,
}: {
  reply: ThreadReply;
  isSelf: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60 group transition-colors">
      <img
        src={reply.avatar_url ? `/avatar/${reply.avatar_url}` : "/avatar/fallback.webp"}
        alt={reply.sender_name}
        className="w-8 h-8 rounded-sm object-cover shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-semibold leading-none ${isSelf ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"}`}>
            {isSelf ? "You" : reply.sender_name}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(reply.created_at)}
          </span>
        </div>
        <div
          className="mt-0.5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed [overflow-wrap:anywhere] prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(reply.content, { ADD_ATTR: ["style"] }),
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ThreadPanel({
  parentMessage,
  onClose,
  onReplyCountChange,
}: ThreadPanelProps) {
  const { user, socket } = useAuth();
  const userId = user?.id;

  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch replies ───────────────────────────────────────────────────────────
  const fetchReplies = useCallback(async () => {
    if (!parentMessage?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/threads/${parentMessage.id}`);
      setReplies(res.data.replies ?? []);
    } catch (err) {
      console.error("Failed to fetch thread replies:", err);
    } finally {
      setLoading(false);
    }
  }, [parentMessage?.id]);

  useEffect(() => {
    setReplies([]);
    fetchReplies();
  }, [fetchReplies]);

  // Auto-scroll to bottom when replies change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  // ─── Socket: live new replies ─────────────────────────────────────────────
  useEffect(() => {
  if (!socket || !parentMessage?.id) return;

  const handleNewReply = (data: any) => {
    if (String(data.parent_message_id) !== String(parentMessage.id)) return;

    const reply: ThreadReply = {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      sender_id: data.sender_id,
      sender_name: data.sender_name,
      avatar_url: data.avatar_url ?? null,
    };

    setReplies((prev) => {
      if (prev.some((r) => String(r.id) === String(reply.id))) return prev;

      const tempIdx = prev.findIndex(
        (r) =>
          String(r.id).startsWith("temp-") &&
          String(r.sender_id) === String(reply.sender_id) &&
          r.content === reply.content
      );

      if (tempIdx !== -1) {
        const next = [...prev];
        next[tempIdx] = reply;
        onReplyCountChange?.(
          parentMessage.id,
          next.filter((r) => !String(r.id).startsWith("temp-")).length
        );
        return next;
      }

      const next = [...prev, reply];
      onReplyCountChange?.(parentMessage.id, next.length);
      return next;
    });
  };

  socket.on("threadReplyAdded", handleNewReply);

  return () => {
    socket.off("threadReplyAdded", handleNewReply); // ✅ now returns void
  };
}, [socket, parentMessage?.id, onReplyCountChange]);

  // ─── Send reply ───────────────────────────────────────────────────────────
  const handleSendReply = async (content: string) => {
    if (!parentMessage?.id || !content.trim()) return;

    // Optimistic update
    const tempReply: ThreadReply = {
      id: `temp-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      sender_id: userId!,
      sender_name: user?.name ?? "You",
      avatar_url: user?.avatar_url ?? null,
    };
    setReplies((prev) => [...prev, tempReply]);

    try {
      const res = await api.post(`/threads/${parentMessage.id}`, { content });
      // Replace temp with real reply
      setReplies((prev) => {
        const next = prev.map((r) =>
          r.id === tempReply.id ? { ...tempReply, id: res.data.id, created_at: res.data.created_at } : r
        );
        onReplyCountChange?.(parentMessage.id, next.filter((r) => !String(r.id).startsWith("temp-")).length);
        return next;
      });
    } catch (err) {
      console.error("Failed to send reply:", err);
      setReplies((prev) => prev.filter((r) => r.id !== tempReply.id));
    }
  };

  if (!parentMessage) return null;

  const groups = groupByDate(replies);

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-700 overflow-hidden"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Thread</h2>
        </div>
        <button
          onClick={onClose}
          title="Close thread"
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Parent message (quoted) ────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 shrink-0">
        <div className="flex items-start gap-2.5">
          <img
            src={parentMessage.avatar_url ? `/avatar/${parentMessage.avatar_url}` : "/avatar/fallback.webp"}
            alt={parentMessage.sender_name ?? "User"}
            className="w-8 h-8 rounded-sm object-cover shrink-0 mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {parentMessage.sender_name ?? "User"}
              </span>
              {parentMessage.created_at && (
                <span className="text-[11px] text-gray-400">
                  {formatTime(parentMessage.created_at)}
                </span>
              )}
            </div>
            <div
              className="mt-0.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed [overflow-wrap:anywhere] prose prose-sm dark:prose-invert max-w-none line-clamp-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(parentMessage.content, { ADD_ATTR: ["style"] }),
              }}
            />
          </div>
        </div>

        {/* Reply count summary */}
        {replies.length > 0 && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        )}
      </div>

      {/* ── Replies list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="space-y-3 px-4 py-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-gray-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-700 rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-2/3 bg-gray-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-gray-400 dark:text-gray-500">
            <MessageSquare size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No replies yet</p>
            <p className="text-xs mt-1">Be the first to reply in this thread</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                    {formatDate(group.items[0].created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
                </div>
                {group.items.map((reply) => (
                  <ReplyBubble
                    key={reply.id}
                    reply={reply}
                    isSelf={String(reply.sender_id) === String(userId)}
                  />
                ))}
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Reply input ───────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-gray-200 dark:border-zinc-700">
        <MessageInput
          onSend={handleSendReply}
          key={String(parentMessage.id)} // remount when thread changes
        />
      </div>
    </div>
  );
}