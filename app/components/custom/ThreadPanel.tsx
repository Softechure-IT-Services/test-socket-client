"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import MessageInput from "@/app/components/custom/MessageInput";
import api from "@/lib/axios";
import { X, MessageSquare } from "lucide-react";
import { MessageRow } from "@/app/components/MessageRow";
import type { MsgFile } from "@/app/components/MessageRow";
import CreateNew from "@/app/components/modals/CreateNew";
import FileBg from "@/app/components/ui/file-bg";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadReply = {
  id: number | string;
  content: string;
  created_at: string;
  updated_at?: string;
  sender_id: string | number;
  sender_name: string;
  avatar_url?: string | null;
  reactions?: { emoji: string; count: number; users?: { id: number | string; name: string }[] }[];
  files?: MsgFile[];
  pinned?: boolean;
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
  /** The channel this thread belongs to — needed to join the socket room so
   *  reactionUpdated events are received and broadcast correctly. */
  channelId: string | number;
  /** Callback so ChannelChat can update the thread_count badge live */
  onReplyCountChange?: (messageId: string | number, count: number) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ThreadPanel({
  parentMessage,
  onClose,
  channelId,
  onReplyCountChange,
}: ThreadPanelProps) {
  const { user, socket } = useAuth();
  const userId = user?.id;

  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Hover / lock state (mirrors ChannelChat) ─────────────────────────────
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [lockedId, setLockedId] = useState<string | number | null>(null);

  // ─── Forward modal ────────────────────────────────────────────────────────
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);

  // ─── Edit mode (mirrors ChannelChat) ─────────────────────────────────────
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  // ─── Drag-and-drop (thread-local — stops propagation to ChannelChat) ────────
  const [threadDragging, setThreadDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const threadDragCounter = useRef(0);

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const handleThreadDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation(); // ← keeps ChannelChat overlay from firing
    threadDragCounter.current += 1;
    setThreadDragging(true);
  };

  const handleThreadDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    threadDragCounter.current -= 1;
    if (threadDragCounter.current === 0) setThreadDragging(false);
  };

  const handleThreadDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleThreadDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    threadDragCounter.current = 0;
    setThreadDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) setDroppedFiles(files);
  };

  // ─── Join the channel's socket room so reactionUpdated is received ─────────
  // ThreadPanel lives alongside ChannelChat which already joins this room,
  // but on the Threads page or in any context where ChannelChat isn't mounted
  // we still need to be in the room to send/receive reaction events.
  useEffect(() => {
    if (!socket || !channelId) return;
    socket.emit("joinChannel", { channel_id: Number(channelId) });
    // No leaveChannel here — ChannelChat owns the room lifecycle when co-mounted.
    // If used standalone the room will be cleaned up when the socket disconnects.
  }, [socket, channelId]);

  // ─── Fetch replies ─────────────────────────────────────────────────────────
  const fetchReplies = useCallback(async () => {
    if (!parentMessage?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/threads/${parentMessage.id}`);
      // Normalise each reply — backend now returns files/reactions as parsed
      // arrays, but guard against both shapes so we're version-resilient.
      const normalised: ThreadReply[] = (res.data.replies ?? []).map((r: any) => {
        let files: MsgFile[] = [];
        if (Array.isArray(r.files)) {
          files = r.files;
        } else if (typeof r.files === "string" && r.files) {
          try { files = JSON.parse(r.files); } catch { files = []; }
        }

        let reactions: ThreadReply["reactions"] = [];
        if (Array.isArray(r.reactions)) {
          reactions = r.reactions;
        } else if (typeof r.reactions === "string" && r.reactions) {
          try { reactions = JSON.parse(r.reactions); } catch { reactions = []; }
        }

        return {
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          updated_at: r.updated_at,
          sender_id: String(r.sender_id),
          sender_name: r.sender_name ?? "Unknown",
          avatar_url: r.avatar_url ?? null,
          files,
          reactions,
          pinned: r.pinned ?? false,
        };
      });
      setReplies(normalised);
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

      let replyFiles: MsgFile[] = [];
      if (Array.isArray(data.files)) {
        replyFiles = data.files;
      } else if (typeof data.files === "string" && data.files) {
        try { replyFiles = JSON.parse(data.files); } catch { replyFiles = []; }
      }

      const reply: ThreadReply = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        avatar_url: data.avatar_url ?? null,
        files: replyFiles,
        reactions: [],
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
      socket.off("threadReplyAdded", handleNewReply);
    };
  }, [socket, parentMessage?.id, onReplyCountChange]);
  
  // ─── Socket: sync reactions from server ──────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleReactionUpdate = ({ messageId, reactions }: any) => {
      setReplies((prev) =>
        prev.map((r) => {
          if (String(r.id) !== String(messageId)) return r;
          const existingReactions = r.reactions ?? [];
          // Mirror ChannelChat's merge exactly: prefer server users if present,
          // fall back to local users (preserves names on clients that set them).
          const merged = (reactions as any[]).map((serverR: any) => {
            const existing = existingReactions.find((lr) => lr.emoji === serverR.emoji);
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
          return { ...r, reactions: merged };
        })
      );
    };
    socket.on("reactionUpdated", handleReactionUpdate);
return () => {
  socket.off("reactionUpdated", handleReactionUpdate);
};
  }, [socket]);

  // ─── Shared reaction helper (optimistic update + socket emit) ───────────
  const applyReaction = useCallback(
    (messageId: string | number, emoji: string) => {
      if (!socket || !userId) return;

      setReplies((prev) =>
        prev.map((r) => {
          if (String(r.id) !== String(messageId)) return r;
          const reactions = (r.reactions ?? []).map((rx) => ({
            ...rx,
            users: Array.isArray(rx.users) ? rx.users : [],
          }));
          const existing = reactions.find((rx) => rx.emoji === emoji);
          if (existing) {
            const alreadyReacted = existing.users.some(
              (u) => String(u.id) === String(userId)
            );
            if (alreadyReacted) {
              existing.users = existing.users.filter(
                (u) => String(u.id) !== String(userId)
              );
            } else {
              existing.users.push({ id: userId, name: user?.name ?? "You" });
            }
            existing.count = existing.users.length;
            return { ...r, reactions: reactions.filter((rx) => rx.count > 0) };
          } else {
            reactions.push({
              emoji,
              count: 1,
              users: [{ id: userId, name: user?.name ?? "You" }],
            });
            return { ...r, reactions };
          }
        })
      );

      socket.emit("reactMessage", { messageId, emoji });
    },
    [socket, userId, user]
  );

  // ─── Socket listeners: edit / delete / pin / unpin for thread replies ───────
  useEffect(() => {
    if (!socket) return;

    const handleEdited = (data: any) => {
      if (!data.is_thread_reply) return;
      setReplies((prev) =>
        prev.map((r) =>
          String(r.id) === String(data.id)
            ? { ...r, content: data.content, updated_at: data.updated_at }
            : r
        )
      );
    };

    const handleDeleted = (data: any) => {
      if (!data.is_thread_reply) return;
      setReplies((prev) => {
        const next = prev.filter((r) => String(r.id) !== String(data.id));
        if (next.length !== prev.length) {
          onReplyCountChange?.(parentMessage!.id, next.length);
        }
        return next;
      });
    };

    const handlePinned = (data: any) => {
      if (!data.is_thread_reply) return;
      setReplies((prev) =>
        prev.map((r) =>
          String(r.id) === String(data.messageId) ? { ...r, pinned: data.pinned } : r
        )
      );
    };

    const handleUnpinned = (data: any) => {
      if (!data.is_thread_reply) return;
      setReplies((prev) =>
        prev.map((r) =>
          String(r.id) === String(data.messageId) ? { ...r, pinned: false } : r
        )
      );
    };

    socket.on("messageEdited", handleEdited);
    socket.on("messageDeleted", handleDeleted);
    socket.on("messagePinned", handlePinned);
    socket.on("messageUnpinned", handleUnpinned);

    return () => {
      socket.off("messageEdited", handleEdited);
      socket.off("messageDeleted", handleDeleted);
      socket.off("messagePinned", handlePinned);
      socket.off("messageUnpinned", handleUnpinned);
    };
  }, [socket, parentMessage, onReplyCountChange]);

  // ─── Edit helpers (mirrors ChannelChat) ─────────────────────────────────
  function enableEditMode(messageId: string | number) {
    const reply = replies.find((r) => String(r.id) === String(messageId));
    if (!reply) return;
    setEditMessageId(String(messageId));
    setEditContent(reply.content);
  }

  function handleCancelEdit() {
    setEditMessageId(null);
    setEditContent("");
  }

  function handleSaveEdit(messageId: string, newContent: string) {
    // Optimistic update
    setReplies((prev) =>
      prev.map((r) =>
        String(r.id) === messageId
          ? { ...r, content: newContent, updated_at: new Date().toISOString() }
          : r
      )
    );
    // Socket emit — server broadcasts messageEdited back to room
    socket?.emit("editMessage", { messageId: Number(messageId), content: newContent });
    setEditMessageId(null);
    setEditContent("");
  }

  // ─── Chat actions — use socket emits so all clients update in real-time ────
  const handleChatAction = useCallback(
    async (action: string, messageId: string) => {
      if (action.startsWith("react:")) {
        applyReaction(messageId, action.slice(6));
        return;
      }

      switch (action) {
        case "edit": {
          enableEditMode(messageId);
          break;
        }
        case "delete": {
          if (!window.confirm("Delete this reply?")) return;
          // Optimistic update
          setReplies((prev) => {
            const next = prev.filter((r) => String(r.id) !== messageId);
            onReplyCountChange?.(parentMessage!.id, next.length);
            return next;
          });
          // Socket emit — server will broadcast messageDeleted back to room
          socket?.emit("deleteMessage", { id: Number(messageId) });
          break;
        }
        case "pin": {
          const reply = replies.find((r) => String(r.id) === messageId);
          const isCurrentlyPinned = reply?.pinned ?? false;
          // Optimistic update
          setReplies((prev) =>
            prev.map((r) =>
              String(r.id) === messageId ? { ...r, pinned: !isCurrentlyPinned } : r
            )
          );
          // Socket emit — server will broadcast messagePinned/Unpinned back
          if (isCurrentlyPinned) {
            socket?.emit("unpinMessage", { messageId: Number(messageId) });
          } else {
            socket?.emit("pinMessage", { messageId: Number(messageId) });
          }
          break;
        }
        case "forward": {
          setForwardMessageId(messageId);
          break;
        }
        default:
          break;
      }
    },
    [replies, parentMessage, onReplyCountChange, socket]
  );

  // ─── Toggle reaction (pill click) ────────────────────────────────────────
  const handleToggleReaction = useCallback(
    (messageId: string | number, emoji: string) => {
      applyReaction(messageId, emoji);
    },
    [applyReaction]
  );

  // ─── File download ────────────────────────────────────────────────────────
  const handleDownload = useCallback((file: MsgFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, []);

  // ─── Send reply ───────────────────────────────────────────────────────────
  const handleSendReply = async (content: string, files?: any[]) => {
    if (!parentMessage?.id || (!content.trim() && (!files || !files.length))) return;

    const tempReply: ThreadReply = {
      id: `temp-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      sender_id: userId!,
      sender_name: user?.name ?? "You",
      avatar_url: user?.avatar_url ?? null,
      files: (files ?? []) as MsgFile[],
      reactions: [],
    };
    setReplies((prev) => [...prev, tempReply]);

    try {
      const res = await api.post(`/threads/${parentMessage.id}`, {
        content,
        files: files ?? [],
      });
      setReplies((prev) => {
        const next = prev.map((r) =>
          r.id === tempReply.id
            ? {
                ...tempReply,
                id: res.data.id,
                created_at: res.data.created_at,
                files: res.data.files ?? files ?? [],
              }
            : r
        );
        onReplyCountChange?.(
          parentMessage.id,
          next.filter((r) => !String(r.id).startsWith("temp-")).length
        );
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
      className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-700 overflow-hidden relative"
      onDragEnter={handleThreadDragEnter}
      onDragOver={handleThreadDragOver}
      onDragLeave={handleThreadDragLeave}
      onDrop={handleThreadDrop}
    >
      {/* Thread drag overlay — only shown when dragging over this panel */}
      {threadDragging && 
      <FileBg />
       } 
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Thread
          </h2>
        </div>
        <button
          onClick={onClose}
          title="Close thread"
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Parent message (quoted) — read-only, no interactions ──────────── */}
      <div className="px-[10px] py-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 shrink-0">
        <MessageRow
          msg={{
            id: parentMessage.id,
            sender_id: "",
            sender_name: parentMessage.sender_name ?? "User",
            avatar_url: parentMessage.avatar_url,
            content: parentMessage.content,
            created_at: parentMessage.created_at,
          }}
          showHeader
          isMember={false}
          in_thread={true}
          className="[&]:px-0 [&]:hover:bg-transparent"
        />

        {replies.length > 0 && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        )}
      </div>

      {/* ── Replies list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 pt-[25px]">
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
                {/* Date separator */}
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                    {formatDate(group.items[0].created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
                </div>

                {group.items.map((reply, replyIdx) => {
                  const replyId = String(reply.id);
                  const prevReply = replyIdx === 0 ? null : group.items[replyIdx - 1];
                  const showHeader =
                    !prevReply ||
                    String(prevReply.sender_id) !== String(reply.sender_id);

                  return (
                    <MessageRow
                      key={reply.id}
                      msg={{
                        id: reply.id,
                        sender_id: reply.sender_id,
                        sender_name: reply.sender_name,
                        avatar_url: reply.avatar_url,
                        content: reply.content,
                        created_at: reply.created_at,
                        updated_at: reply.updated_at,
                        reactions: reply.reactions,
                        files: reply.files,
                        pinned: reply.pinned,
                      }}
                      showHeader={showHeader}
                      currentUserId={userId}
                      // ── Full interaction suite — mirrors ChannelChat ──────
                      isMember={true}
                      in_thread={true}
                      isHovered={hoveredId === replyId}
                      isLocked={lockedId === replyId}
                      onChatAction={handleChatAction}
                      onChatHoverOpenChange={(isOpen) => {
                        if (isOpen) {
                          setLockedId(replyId);
                        } else {
                          setLockedId(null);
                          setHoveredId((prev) => (prev === replyId ? null : prev));
                        }
                      }}
                      onToggleReaction={handleToggleReaction}
                      onDownloadFile={handleDownload}
                      onShareFile={(id) => setForwardMessageId(String(id))}
                      onMouseEnter={() => {
                        if (!lockedId) setHoveredId(replyId);
                      }}
                      onMouseLeave={() => {
                        if (lockedId !== replyId) setHoveredId(null);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Reply input ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2 dark:border-zinc-700">
        <MessageInput
          onSend={handleSendReply}
          key={String(parentMessage.id)}
          in_thread={true}
          dropFiles={droppedFiles}
          onDropFilesConsumed={() => setDroppedFiles([])}
          editingMessageId={editMessageId}
          editingInitialContent={editContent}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {/* Forward modal */}
      <CreateNew
        open={!!forwardMessageId}
        onClose={() => setForwardMessageId(null)}
        type="forward"
        forwardMessageId={forwardMessageId}
      />
    </div>
  );
}