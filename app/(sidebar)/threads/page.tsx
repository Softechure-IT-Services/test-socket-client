"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import MessageInput from "@/app/components/custom/MessageInput";
import { ChannelLabel } from "@/app/components/MessageMeta";
import { MessageRow, MessageSkeleton } from "@/app/components/MessageRow";
import type { MsgFile } from "@/app/components/MessageRow";
import CreateNew from "@/app/components/modals/CreateNew";
import FileBg from "@/app/components/ui/file-bg";

// ─── Types ────────────────────────────────────────────────────────────────────

type Reply = {
  id: number | string;
  content: string;
  created_at: string;
  updated_at?: string;
  sender_id: number;
  sender_name: string;
  avatar_url: string | null;
  reactions?: { emoji: string; count: number; users?: { id: number | string; name: string }[] }[];
  files?: MsgFile[];
  pinned?: boolean;
};

type ParentMessage = {
  id: number;
  sender_id?: number;
  content: string;
  sender_name: string;
  avatar_url: string | null;
  created_at: string;
};

type Thread = {
  thread_id: number;
  channel_id: number;
  channel_name: string | null;
  is_dm: boolean;
  is_private: boolean;
  parent_message: ParentMessage | null;
  replies: Reply[];
};

// ─── ThreadCard ────────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  currentUser,
  socket,
}: {
  thread: Thread;
  currentUser: { id: string | number; name: string; avatar_url?: string | null } | null;
  socket: any;
}) {
  const [replies, setReplies] = useState<Reply[]>(thread.replies);
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
const [editMessageId, setEditMessageId] = useState<string | null>(null);
const [editContent, setEditContent] = useState<string>("");
  // ── Hover / lock state ──────────────────────────────────────────────────────
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [lockedId, setLockedId] = useState<string | number | null>(null);

  // ── Forward modal ───────────────────────────────────────────────────────────
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounter = useRef(0);

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  // const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
  //   if (!isFileDrag(e)) return;
  //   e.preventDefault();
  //   dragCounter.current += 1;
  //   setDragging(true);
  // };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  e.stopPropagation();
  dragCounter.current += 1;
  setDragging(true);
};
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
      e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
      e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
      e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length){setDroppedFiles(files); setReplying(true);}
  };

  // ── Refresh replies ─────────────────────────────────────────────────────────
  const fetchReplies = useCallback(async () => {
    if (!thread.parent_message?.id) return;
    try {
      const res = await api.get(`/threads/${thread.parent_message.id}`);
      setReplies(res.data.replies ?? []);
    } catch (err) {
      console.error("Failed to refresh replies:", err);
    }
  }, [thread.parent_message?.id]);

  // ── Join this thread's channel room so reactionUpdated is received ──────────
  useEffect(() => {
    if (!socket || !thread.channel_id) return;
    socket.emit("joinChannel", { channel_id: Number(thread.channel_id) });
  }, [socket, thread.channel_id]);

  // Live socket updates for this thread
  useEffect(() => {
    if (!socket) return;
    const handle = (data: any) => {
      if (!thread.parent_message) return;
      if (String(data.parent_message_id) !== String(thread.parent_message.id)) return;

      const newReply: Reply = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        avatar_url: data.avatar_url ?? null,
        files: Array.isArray(data.files) && data.files.length > 0 ? data.files : undefined,
      };

      setReplies((prev) => {
        if (prev.some((r) => String(r.id) === String(newReply.id))) return prev;
        const tempIdx = prev.findIndex(
          (r) =>
            String(r.id).startsWith("temp-") &&
            String(r.sender_id) === String(newReply.sender_id) &&
            r.content === newReply.content
        );
        if (tempIdx !== -1) {
          const next = [...prev];
          // Preserve files from the optimistic message if server didn't return them yet
          next[tempIdx] = {
            ...newReply,
            files: newReply.files ?? prev[tempIdx].files,
          };
          return next;
        }
        return [...prev, newReply];
      });
    };

    socket.on("threadReplyAdded", handle);
    return () => socket.off("threadReplyAdded", handle);
  }, [socket, thread.parent_message?.id]);

  // Sync server-confirmed reactions
  useEffect(() => {
    if (!socket) return;
    const handleReactionUpdate = ({ messageId, reactions }: any) => {
      setReplies((prev) =>
        prev.map((r) => {
          if (String(r.id) !== String(messageId)) return r;
          const existingReactions = r.reactions ?? [];
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
    return () => socket.off("reactionUpdated", handleReactionUpdate);
  }, [socket]);

  // Auto-expand + scroll when reply box opens or new reply arrives while open
  useEffect(() => {
    if (replying) setExpanded(true);
  }, [replying]);

  useEffect(() => {
    if (replying) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [replies.length, replying]);

  // ── Shared reaction helper (optimistic update + socket emit) ──────────────
  const applyReaction = useCallback(
    (messageId: string | number, emoji: string) => {
      if (!socket || !currentUser?.id) return;
      const uid = currentUser.id;
      const uname = currentUser.name ?? "You";

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
              (u) => String(u.id) === String(uid)
            );
            if (alreadyReacted) {
              existing.users = existing.users.filter(
                (u) => String(u.id) !== String(uid)
              );
            } else {
              existing.users.push({ id: uid, name: uname });
            }
            existing.count = existing.users.length;
            return { ...r, reactions: reactions.filter((rx) => rx.count > 0) };
          } else {
            reactions.push({ emoji, count: 1, users: [{ id: uid, name: uname }] });
            return { ...r, reactions };
          }
        })
      );

      socket.emit("reactMessage", { messageId, emoji });
    },
    [socket, currentUser]
  );

  useEffect(() => {
  if (replying) {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }
}, [replying]);

  // ── Chat actions ────────────────────────────────────────────────────────────
  const handleChatAction = useCallback(
    async (action: string, messageId: string) => {
      if (action.startsWith("react:")) {
        applyReaction(messageId, action.slice(6));
        return;
      }

      switch (action) {
        case "edit": {
  const reply = replies.find((r) => String(r.id) === messageId);
  if (!reply) return;

  setEditMessageId(String(messageId));
  setEditContent(reply.content);
  setReplying(true); 
  break;
}
        case "delete": {
          if (!window.confirm("Delete this reply?")) return;
          // Optimistic update
          setReplies((prev) => prev.filter((r) => String(r.id) !== messageId));
          if (socket) {
            socket.emit("deleteMessage", { id: Number(messageId) });
          } else {
            try {
              await api.delete(`/messages/${messageId}`);
            } catch (err) {
              console.error("Failed to delete reply:", err);
              fetchReplies(); // revert on failure
            }
          }
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
          if (socket) {
            if (isCurrentlyPinned) {
              socket.emit("unpinMessage", { messageId: Number(messageId), channel_id: Number(thread.channel_id) });
            } else {
              socket.emit("pinMessage", { messageId: Number(messageId), channel_id: Number(thread.channel_id) });
            }
          } else {
            try {
              await api.post(`/messages/${messageId}/pin`);
            } catch (err) {
              console.error("Failed to pin reply:", err);
              // revert
              setReplies((prev) =>
                prev.map((r) =>
                  String(r.id) === messageId ? { ...r, pinned: isCurrentlyPinned } : r
                )
              );
            }
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
    [replies, fetchReplies, socket, thread.channel_id]
  );

  function handleCancelEdit() {
  setEditMessageId(null);
  setEditContent("");
}

async function handleSaveEdit(messageId: string, newContent: string) {
  try {
    await api.put(`/messages/${messageId}`, { content: newContent });

    setReplies((prev) =>
      prev.map((r) =>
        String(r.id) === String(messageId)
          ? {
              ...r,
              content: newContent,
              updated_at: new Date().toISOString(),
            }
          : r
      )
    );
  } catch (err) {
    console.error("Failed to edit reply:", err);
  }

  setEditMessageId(null);
  setEditContent("");
}

  // ── Toggle reaction (pill click) ────────────────────────────────────────────
  const handleToggleReaction = useCallback(
    (messageId: string | number, emoji: string) => {
      applyReaction(messageId, emoji);
    },
    [applyReaction]
  );

  // ── File download ────────────────────────────────────────────────────────────
  const handleDownload = useCallback((file: MsgFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, []);

  const handleSend = async (content: string, files?: any[]) => {
    if (!thread.parent_message?.id || (!content.trim() && (!files || !files.length))) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Reply = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      sender_id: Number(currentUser?.id),
      sender_name: currentUser?.name ?? "You",
      avatar_url: currentUser?.avatar_url ?? null,
      files: (files ?? []) as MsgFile[],
    };
    setReplies((prev) => [...prev, optimistic]);

    try {
      const res = await api.post(`/threads/${thread.parent_message.id}`, {
        content,
        files: files ?? [],
      });
      setReplies((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? { ...optimistic, id: res.data.id, created_at: res.data.created_at, files: res.data.files ?? files ?? [] }
            : r
        )
      );
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
    }
  };

  const visibleReplies = expanded ? replies : replies.slice(0, 2);
  const hiddenCount = replies.length - 2;

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && <FileBg />}

      {/* ── Channel label bar ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
        <ChannelLabel
          name={thread.channel_name}
          isDm={thread.is_dm}
          isPrivate={thread.is_private}
        />
        <span className="ml-auto text-gray-300 dark:text-zinc-600 text-xs">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
      </div>

      <div className="pb-3">

        {/* ── Parent message — always showHeader, no interactions ── */}
        {thread.parent_message && (
          <div className="border-b border-dashed border-gray-200 bg-gray-100 dark:border-zinc-800 mb-1">
            <MessageRow
              msg={{
                id: thread.parent_message.id,
                sender_id: thread.parent_message.sender_id ?? "",
                sender_name: thread.parent_message.sender_name,
                avatar_url: thread.parent_message.avatar_url,
                content: thread.parent_message.content,
                created_at: thread.parent_message.created_at,
              }}
              showHeader
              isMember={false}
            />
          </div>
        )}

        {/* ── Replies — full interaction suite ── */}
        {visibleReplies.length > 0 && (
          <div>
            {visibleReplies.map((reply, replyIdx) => {
              const replyId = String(reply.id);
              const prevReply = replyIdx === 0 ? null : visibleReplies[replyIdx - 1];
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
                  currentUserId={currentUser?.id}
                  // ── Full interaction suite ──────────────────────────────
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
        )}

        <div className="px-[25px]">
          {/* ── Show more / less ── */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              {expanded
                ? "Show less"
                : `+${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
            </button>
          )}

          {/* ── Inline reply input ── always visible ── */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <MessageInput
              onSend={handleSend}
              key={`reply-${thread.thread_id}`}
              editingMessageId={editMessageId}
              editingInitialContent={editContent}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              dropFiles={droppedFiles}
              onDropFilesConsumed={() => setDroppedFiles([])}
            />
          </div>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Forward modal (scoped to this card) */}
      <CreateNew
        open={!!forwardMessageId}
        onClose={() => setForwardMessageId(null)}
        type="forward"
        forwardMessageId={forwardMessageId}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ThreadsPage() {
  const { user, socket } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/threads");
        setThreads(res.data);
      } catch {
        setError("Failed to load threads.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-5 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Threads
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Conversations you're part of, sorted by latest activity.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden"
              >
                <div className="h-8 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800" />
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && threads.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No threads yet</p>
            <p className="text-sm text-gray-400 mt-1">Reply to a message to start a thread.</p>
          </div>
        )}

        {!loading && !error && threads.length > 0 && (
          <div className="space-y-4">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.thread_id}
                thread={thread}
                currentUser={user}
                socket={socket}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}