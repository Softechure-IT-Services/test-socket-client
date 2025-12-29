"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/context/userId_and_connection/provider";
import MessageInput from "@/components/custom/MessageInput";
import ChatHover from "@/components/chat-hover";
import DOMPurify from "dompurify";
import MainHeader from "@/app/shared/ui/MainHeader";
import  FileBg from "@/components/ui/file-bg";
import FileUploadToggle from "@/components/ui/file-upload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger, 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Picker from "@emoji-mart/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
type Reaction = { emoji: string; count: number; users?: string[] };
type ChatMessage = {
  id?: number | string;
  sender_id: string;
  content: string;
  self: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  reactions?: Reaction[];
  avatar_url?: string | null;
};
type ChannelChatProps = {
  channelId: string;
};



export default function ChannelChat({ channelId }: ChannelChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // const [userId, setUserId] = useState<string>("");
  // const [tempUserId, setTempUserId] = useState<string>("");
  // const [connected, setConnected] = useState(false);
  // const socketRef = useRef<Socket | null>(null);
const { socket, user, isOnline } = useAuth();
const userId = user?.id;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.1.14:5000";

  // EDIT state (we'll load content into the MessageInput when editing)
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(
    null
  );


  // for drag and drop file 
     const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // important to allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);

    const files = e.dataTransfer.files;
    if (files.length) {
      console.log("Dropped files:", files);
      // Handle files here
    }
  };

useEffect(() => {
  if (!socket || !channelId) return;

  socket.emit("joinChannel", { channelId: Number(channelId) });

  return () => {
    if (socket) {
      socket.emit("leaveChannel", { channelId: Number(channelId) });
    }
  };
}, [socket, channelId]);



useEffect(() => {
  if (!socket) return;

  const handleDelete = ({ id }: any) => {
    setMessages(prev =>
      prev.filter(m => String(m.id) !== String(id))
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
    const createdAt = msg.created_at ?? new Date().toISOString();
    const chatMsg: ChatMessage = {
      id: stableId,
      sender_id: msg.sender_id,
      content: msg.content,
      self: String(msg.sender_id) === String(userId),
      created_at: createdAt,
      avatar_url: msg.avatar_url ?? null,
    };
    setMessages((prev) => {
      if (
        chatMsg.id != null &&
        prev.some((m) => String(m.id) === String(chatMsg.id))
      )
        return prev;
      const next = [...prev, chatMsg].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      return next;
    });
  };

  const handleAck = (msg: any) => {
    const stableId =
      msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;
    const createdAt = msg.created_at ?? new Date().toISOString();
    const chatMsg: ChatMessage = {
      id: stableId,
      sender_id: msg.sender_id,
      content: msg.content,
      self: true,
      created_at: createdAt,
      avatar_url: user?.avatar_url ?? null,
    };
    setMessages((prev) => {
      if (
        chatMsg.id != null &&
        prev.some((m) => String(m.id) === String(chatMsg.id))
      )
        return prev;
      const next = [...prev, chatMsg].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      return next;
    });
  };

  const handleReactionsUpdate = ({ messageId, reactions }: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        String(msg.id) === String(messageId) ? { ...msg, reactions } : msg
      )
    );
  };

  const handleMessageEdited = (msg: any) => {
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(msg.id) ? { ...m, content: msg.content } : m
      )
    );
  };

  socket.on("receiveMessage", handleReceive);
  socket.on("messageAck", handleAck);
  socket.on("reactionUpdated", handleReactionsUpdate);
  socket.on("messageEdited", handleMessageEdited);

  return () => {
    socket.off("receiveMessage", handleReceive);
    socket.off("messageAck", handleAck);
    socket.off("reactionUpdated", handleReactionsUpdate);
    socket.off("messageEdited", handleMessageEdited);
  };
}, [socket, userId]);

  useEffect(() => {
    if (!userId || !channelId) return;
    fetch(`${SERVER_URL}/channels/${channelId}/messages`)
      .then((res) => res.json())
      .then((data: any[]) => {
        const mapped: ChatMessage[] = data
          .map((msg: any) => {
            const stableId =
              msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;
            const createdAt = msg.created_at ?? new Date().toISOString();
            let reactions: Reaction[] | undefined;
            if (msg.reactions) {
              try {
                const raw =
                  typeof msg.reactions === "string"
                    ? JSON.parse(msg.reactions)
                    : msg.reactions;
                reactions = raw.map((r: any) => ({
                  emoji: r.emoji,
                  count: r.count,
                  users: r.users,
                }));
              } catch {
                reactions = [];
              }
            }
            return {
              id: stableId,
              sender_id: String(msg.sender_id),
              content: msg.content,
              self: String(msg.sender_id) === String(userId),
              created_at: createdAt,
              updated_at: msg.updated_at ?? null,
              reactions,
              avatar_url: msg.avatar_url ?? null,
            };
          })
          .sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return ta - tb;
          });
        setMessages(mapped);
      })
      .catch((err) => {
        console.error("Failed to fetch messages:", err);
      });
  }, [channelId, userId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  const handleSendMessage = (content: string, files?: File[]) => {
    if (!userId) return alert("Set your user ID first!");
    //const socket = socketRef.current;
    if (!socket || !socket.connected) return alert("Socket not connected yet.");
    socket.emit("sendMessage", { content, channel_id: Number(channelId) });
  };


  // Edit flow: when user clicks edit, we load content into MessageInput
  function enableEditMode(messageId: string | number) {
    const msg = messages.find((m) => String(m.id) === String(messageId));
    if (!msg) return;
    setEditMessageId(String(messageId));
    setEditContent(msg.content);
    // MessageInput will pick this up via props and show Update/Cancel
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
  // const socket = socketRef.current;

  // optimistic update locally
  setMessages((prev) =>
    prev.map((m) =>
      String(m.id) === String(messageId)
        ? { ...m, content: newContent, updated_at: new Date().toISOString() }
        : m
    )
  );

  if (socket && socket.connected) {
    socket.emit("editMessage", { messageId, content: newContent,  channel_id: Number(channelId), });
  } else {
    console.warn("Socket not connected — edit will not be sent to server now.");
  }

  setEditMessageId(null);
  setEditContent("");
}


  function openEmojiPicker(messageId: string) {
    setShowEmojiPickerFor(messageId);
  }

 function addEmojiToMessage(messageId: string | number, emoji: any) {
  if (!socket || !userId) {
    setShowEmojiPickerFor(null);
    return;
  }

  const selectedEmoji = emoji.native ?? emoji.colons ?? String(emoji);

  setMessages((prev) =>
    prev.map((msg) => {
      if (String(msg.id) !== String(messageId)) return msg;

      const reactions = msg.reactions
        ? msg.reactions.map((r) => ({
            ...r,
            users: Array.isArray(r.users) ? r.users : [],
          }))
        : [];

      const existing = reactions.find((r) => r.emoji === selectedEmoji);

      if (existing) {
        if (!existing.users.includes(userId)) {
          existing.users.push(userId);
          existing.count = existing.users.length;
        }
      } else {
        reactions.push({
          emoji: selectedEmoji,
          count: 1,
          users: [userId],
        });
      }

      return { ...msg, reactions };
    })
  );

  socket.emit("reactMessage", { messageId, emoji: selectedEmoji });
  setShowEmojiPickerFor(null);
}


  // function toggleReaction(messageId: string | number, emoji: string) {
  //   //const socket = socketRef.current;
  //   if (!socket) return;

  //   setMessages((prev) =>
  //     prev.map((msg) => {
  //       if (String(msg.id) !== String(messageId)) return msg;

  //       const reactions = msg.reactions
  //         ? msg.reactions.map((r) => ({
  //             ...r,
  //             users: Array.isArray(r.users) ? r.users : [],
  //           }))
  //         : [];

  //       const idx = reactions.findIndex((r) => r.emoji === emoji);

  //       if (idx === -1) {
  //         // User adds reaction
  //         reactions.push({ emoji, count: 1, users: [userId] });
  //       } else {
  //         const entry = reactions[idx];
  //         const hasReacted = entry.users.includes(userId);

  //         if (!hasReacted) {
  //           // User adds reaction (other users already reacted)
  //           const newUsers = [...entry.users, userId];
  //           reactions[idx] = {
  //             ...entry,
  //             users: newUsers,
  //             count: newUsers.length,
  //           };
  //         } else {
  //           // User can ONLY remove THEIR OWN reaction, not others
  //           const newUsers = entry.users.filter((u) => u !== userId);

  //           // If after removing yourself, others still reacted → keep reaction
  //           if (newUsers.length > 0) {
  //             reactions[idx] = {
  //               ...entry,
  //               users: newUsers,
  //               count: newUsers.length,
  //             };
  //           } else {
  //             // If no one else reacted → remove reaction entirely
  //             reactions.splice(idx, 1);
  //           }
  //         }
  //       }

  //       return { ...msg, reactions };
  //     })
  //   );

  //   socket.emit("reactMessage", { messageId, emoji });
  // }

  function toggleReaction(messageId: string | number, emoji: string) {
  if (!socket || !userId) return;

  setMessages((prev) =>
    prev.map((msg) => {
      if (String(msg.id) !== String(messageId)) return msg;

      const reactions = msg.reactions
        ? msg.reactions.map((r) => ({
            ...r,
            users: Array.isArray(r.users) ? r.users : [],
          }))
        : [];

      const idx = reactions.findIndex((r) => r.emoji === emoji);

      if (idx === -1) {
        reactions.push({ emoji, count: 1, users: [userId] });
      } else {
        const entry = reactions[idx];
        const hasReacted = entry.users.includes(userId);

        if (!hasReacted) {
          const newUsers = [...entry.users, userId];
          reactions[idx] = {
            ...entry,
            users: newUsers,
            count: newUsers.length,
          };
        } else {
          const newUsers = entry.users.filter((u) => u !== userId);

          if (newUsers.length > 0) {
            reactions[idx] = {
              ...entry,
              users: newUsers,
              count: newUsers.length,
            };
          } else {
            reactions.splice(idx, 1);
          }
        }
      }

      return { ...msg, reactions };
    })
  );

  socket.emit("reactMessage", { messageId, emoji });
}


  function handleChatAction(action: string, messageId: string) {
    switch (action) {
      case "reaction":
        openEmojiPicker(messageId);
        break;
      case "reply":
        // setReplyToMessage(messageId);
        break;
      case "pin":
        break;
      case "forward":
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
    //const socket = socketRef.current;
    if (!socket) return;
    socket.emit("deleteMessage", { id: messageId });
    setMessages((prev) =>
      prev.filter((m) => String(m.id) !== String(messageId))
    );
  }

useEffect(() => {
  setMessages([]);
}, [channelId]);

  return (
    <div className="flex min-h-[100%] dark:bg-black  "  onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>

       {dragging && (
  <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
    <FileBg />
  </div>
)}
      <main className="flex flex-col flex-1">
       <MainHeader id={channelId} type={'channel'} />

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto py-6 !px-[3rem] "
          style={{ scrollbarGutter: "stable" }}
        >
          {messages.map((msg, index) => {
            const msgId = String(msg.id);
            const prev = messages[index - 1];
            const showAvatar =
              !prev || prev.sender_id !== msg.sender_id;

            return (
              <div
                key={msgId}
                className={`hover:bg-gray-50 p-1 rounded-xl relative flex items-center gap-3 ${
                  msg.self ? "justify-end" : "justify-start"
                }`}
                onMouseEnter={() => setHoveredId(msgId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {hoveredId === msgId && msg.self && (
                  <ChatHover messageId={msgId} onAction={handleChatAction} />
                )}

                <div
                  className={`p-1 rounded-xl break-words flex  ${
                    msg.self ? "flex-row-reverse" : "flex-row"
                  }  gap-2 items-center relative `}
                >
                   {!msg.self && showAvatar && (
                    <img
                      src={msg.avatar_url != null ? `/avatar/${msg.avatar_url}` : "/avatar/avatar-placeholder.png"}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div className="relative">
                    <div
                      className={`rounded-md p-2 break-words w-fit ${
                        msg.self ? "bg-black text-white" : "bg-zinc-200"
                      }`}
                    >
                      <div
                        className="leading-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.content),
                        }}
                      />
                    </div>
                  </div>

                  {msg.reactions && msg.reactions.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex gap-1 flex-wrap whitespace-nowrap cursor-pointer">
                          {msg.reactions.map((r, idx) => (
                            <span
                              key={idx}
                              onClick={() => {
                                  if (msg.id == null) return;
                                  toggleReaction(msg.id, r.emoji);
                              }}
                              className="text-sm px-2 leading-none py-1 bg-gray-200 rounded-full flex items-center gap-1 border border-black"
                            >
                              {r.emoji} {r.count <= 1 ? "" : r.count}
                            </span>
                          ))}
                        </div>
                      </TooltipTrigger>

                      <TooltipContent className="bg-black text-white p-2 text-xs rounded-md grid grid-cols-2 gap-1">
                        <p className="font-semibold mb-1 col-span-2">
                          Reactions:
                        </p>

                        {msg.reactions.map((r, i) => (
                          <div key={i} className="mb-1 col-span-1">
                            <strong>{r.emoji}</strong>
                            <div className="ml-2 ">
                             {(r.users ?? []).map((uid, j) => (
                                <div key={j}>User {uid}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {msg.created_at && (
                    <div
                      className={`text-[10px] top-[50%] translate-y-[-50%] opacity-60 absolute flex-col ${
                        msg.self
                          ? "right-0 translate-x-[calc(100%+4px)]"
                          : "left-0 -translate-x-[calc(100%+4px)]"
                      } whitespace-nowrap flex items-center gap-0`}
                    >
                      {new Date(msg.created_at).toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })}

                      {/* 👇 Show "edited" only if the message was edited */}
                      {msg.updated_at && msg.updated_at !== msg.created_at && (
                        <span className="italic opacity-60 ml-1">(edited)</span>
                      )}
                    </div>
                  )}
                </div>

                {showEmojiPickerFor === msgId && (
                  <Popover
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) setShowEmojiPickerFor(null);
                    }}
                  >
                    <PopoverTrigger>
                      <Button
                        size="sm"
                        className="absolute -right-10 top-2 p-1"
                        aria-label="Emoji picker trigger"
                      >
                        😊
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-[99999]">
                      <Picker
                        onEmojiSelect={(emoji:any) =>
                          addEmojiToMessage(msgId, emoji)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {hoveredId === msgId && !msg.self && (
                  <ChatHover messageId={msgId} onAction={handleChatAction} />
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 relative sticky bottom-0 right-0 bg-white dark:bg-zinc-900 border-t">
          {/* Pass edit state into MessageInput. When user clicks edit, MessageInput will show Update/Cancel and call onSaveEdit/onCancelEdit */}
          <div>
          <FileUploadToggle />
          </div>
          <MessageInput
            onSend={handleSendMessage}
            editingMessageId={editMessageId}
            editingInitialContent={editContent}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </main>
    </div>
  );
}
