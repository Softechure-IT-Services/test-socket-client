"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import MessageInput from "@/app/components/custom/MessageInput";
import ChatHover from "@/app/components/chat-hover";
import DOMPurify from "dompurify";
import FileBg from "@/app/components/ui/file-bg";
import FileUploadToggle from "@/app/components/ui/file-upload";
import Dateseparator from "@/app/components/ui/date";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import Picker from "@emoji-mart/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { TbPinFilled } from "react-icons/tb";
import api from "@/lib/axios";

type User = {
  name: string;
}
type ReactionUser = {
  id: number | string;
  name: string;
};
type Reaction = { emoji: string; count: number; users?:  ReactionUser[] };
type ChatFile = {
  url: string;
  name: string;
  type: string;
  size: number;
};
type Channel = {
  id: number | string;
  is_private: boolean;
  is_dm?: boolean;
  // add anything else you need later
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
};
type ChannelChatProps = {
  channelId: string;
};

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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  // const [userId, setUserId] = useState<string>("");
  // const [tempUserId, setTempUserId] = useState<string>("");
  // const [connected, setConnected] = useState(false);
  // const socketRef = useRef<Socket | null>(null);
  const { socket, user, isOnline } = useAuth();
  const userId = user?.id;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.0.113:5000";

  // EDIT state (we'll load content into the MessageInput when editing)
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(
    null,
  );

  // for drag and drop file
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const messageBoxRef = useRef<HTMLDivElement | null >(null);
const didInitialScrollRef = useRef(false);
const loadingMoreRef = useRef(false);

const [hasNewMessages, setHasNewMessages] = useState(false);
const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
const oldestMessageId = messages[0]?.id;
const topMessageRef = useRef<HTMLDivElement | null>(null);


  const isFileDrag = (e: React.DragEvent) => {
    return Array.from(e.dataTransfer.types).includes("Files");
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;

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
    if (!isFileDrag(e)) return;

    e.preventDefault(); // allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;

    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    // 🔥 send files
    handleSendMessage("", files);
  };

  useEffect(() => {
    if (!channelId) return;
    api
      .get(`/channels/${channelId}`)
      .then((res) => {
        const data = res.data;
        setChannel(data.channel);
        if (data.channel?.is_dm) {
          setIsDm(true);
          setDmOtherUser(data.dm_user);
        } else {
          setIsDm(false);
        }
      })
      .catch((err) => console.error(err));
  }, [channelId]);

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
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(id)));
    };

    socket.on("messageDeleted", handleDelete);

    return () => {
      socket.off("messageDeleted", handleDelete);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !userId) return;

//     const handleReceive = (msg: any) => {
//       if (String(msg.channel_id) !== String(channelId)) return;
//         if (String(msg.sender_id) === String(userId)) return;


//       const stableId =
//         msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;

//       const chatMsg: ChatMessage = {
//         id: stableId,
//         sender_id: msg.sender_id,
//         sender_name: msg.sender_name,
//         content: msg.content,
//         files: Array.isArray(msg.files) ? msg.files : [],
//         self: String(msg.sender_id) === String(userId),
//         created_at: msg.created_at ?? new Date().toISOString(),
//         avatar_url: msg.avatar_url ?? null,
//       };

//       // setMessages((prev) => {
//       //   // 1️⃣ Try to find the optimistic message to replace
//       //   const tempIdx = prev.findIndex(
//       //     (m) =>
//       //       m.self &&
//       //       m.id.toString().startsWith("temp-") &&
//       //       m.content === chatMsg.content,
//       //   );

//       //   if (tempIdx !== -1) {
//       //     const next = [...prev];
//       //     next[tempIdx] = chatMsg;
//       //     return next;
//       //   }

//       //   // 2️⃣ Prevent duplicates if message already exists
//       //   if (prev.some((m) => String(m.id) === String(chatMsg.id))) return prev;

//       //   return [...prev, chatMsg].sort(
//       //     (a, b) =>
//       //       new Date(a.created_at!).getTime() -
//       //       new Date(b.created_at!).getTime(),
//       //   );
//       // });
//       setMessages((prev) => {
//   const exists = prev.some((m) => String(m.id) === String(chatMsg.id));
//   if (exists) return prev;

//   const next = [...prev, chatMsg].sort(
//     (a, b) =>
//       new Date(a.created_at!).getTime() -
//       new Date(b.created_at!).getTime()
//   );

//   // 👇 If user is NOT near bottom → show indicator
//   if (!shouldAutoScrollRef.current && !chatMsg.self) {
//   setHasNewMessages(true);

//   setHighlightedIds((prevSet) => {
//     const copy = new Set(prevSet);
//     copy.add(String(chatMsg.id));
//     return copy;
//   });
// }


//   return next;
// });

//     };

    const handleReceive = (msg: any) => {
  if (String(msg.channel_id) !== String(channelId)) return;

  const stableId = msg.id ?? `${msg.sender_id}-${msg.created_at ?? Date.now()}`;

  const chatMsg: ChatMessage = {
    id: stableId,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    content: msg.content,
    files: Array.isArray(msg.files) ? msg.files : [],
    self: String(msg.sender_id) === String(userId),
    created_at: msg.created_at ?? new Date().toISOString(),
    avatar_url: msg.avatar_url ?? null,
  };

  setMessages((prev) => {
    // 🔹 Replace temp message if this is from the sender
    const tempIdx = prev.findIndex(
      (m) =>
        m.self &&
        m.id?.toString().startsWith("temp-") &&
        m.content === chatMsg.content
    );

    if (tempIdx !== -1) {
      const next = [...prev];
      next[tempIdx] = chatMsg; // replace temp with server message
      return next;
    }

    // 🔹 Prevent duplicates if message already exists
    if (prev.some((m) => String(m.id) === String(chatMsg.id))) return prev;

    const next = [...prev, chatMsg].sort(
      (a, b) =>
        new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
    );

    // handle highlighted messages for auto scroll
    if (!shouldAutoScrollRef.current && !chatMsg.self) {
      setHasNewMessages(true);
      setHighlightedIds((prevSet) => {
        const copy = new Set(prevSet);
        copy.add(String(chatMsg.id));
        return copy;
      });
    }

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
        sender_name: msg.sender_name,
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
          String(msg.id) === String(messageId) ? { ...msg, reactions } : msg,
        ),
      );
    };

    const handleMessageEdited = (msg: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(msg.id) ? { ...m, content: msg.content } : m,
        ),
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

  // const loadMessages = useCallback(
  //   async (initial = false) => {
  //     if (!channelId || !userId) return;

  //     console.log("loadMessages called", {
  //       initial,
  //       hasMore,
  //       isLoadingMore,
  //       nextCursor,
  //     });

  //     // prevent overlapping and useless loads
  //     if (!initial) {
  //       if (isLoadingMore) return;
  //       if (!hasMore) return;
  //       // if (nextCursor == null) return;
  //     }

  //     const el = containerRef.current;
  //     const prevScrollHeight = el?.scrollHeight ?? 0;

  //     if (initial) {
  //       setInitialLoading(true);
  //     } else {
  //       setIsLoadingMore(true);
  //     }

  //     try {
  //       const res = await api.get(`/channels/${channelId}/messages`, {
  //         params: {
  //           limit: 16,
  //           cursor: initial ? null : nextCursor,
  //         },
  //       });

  //       const data = res.data;

  //       const mapped: ChatMessage[] = data.messages.map((msg: any) => ({
  //         id: msg.id,
  //         sender_id: String(msg.sender_id),
  //         sender_name: msg.sender_name,
  //         content: msg.content,
  //         files: msg.files ? JSON.parse(msg.files) : [],
  //         self: String(msg.sender_id) === String(userId),
  //         created_at: msg.created_at,
  //         updated_at: msg.updated_at,
  //         reactions: msg.reactions ? JSON.parse(msg.reactions) : [],
  //         avatar_url: msg.avatar_url ?? null,
  //         pinned: msg.pinned === true,
  //       }));

  //       setMessages((prev) => (initial ? mapped : [...mapped, ...prev]));

  //       const newCursor = data.nextCursor ?? null;

  //       // If no messages or cursor didn't move, stop further loading
  //       if (!mapped.length || newCursor == null) {
  //         setHasMore(false);
  //       } else {
  //         setHasMore(true);
  //         setNextCursor(newCursor);
  //       }


  //       if (!initial && el) {
  //         requestAnimationFrame(() => {
  //           const newScrollHeight = el.scrollHeight;
  //           el.scrollTop = newScrollHeight - prevScrollHeight;
  //         });
  //       }
  //     } catch (err) {
  //       console.error("Failed to load messages:", err);
  //     } finally {
  //       if (initial) {
  //         setInitialLoading(false);
  //       } else {
  //         setIsLoadingMore(false);
  //       }
  //     }
  //   },
  //   [channelId, userId, hasMore, isLoadingMore, nextCursor],
  // );

const loadMessages = useCallback(
  async (initial = false) => {
    if (!channelId || !userId) return;

    // 🔒 HARD LOCK (prevents double fetch in same frame)
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
          cursor: messages[0]?.id ?? null,
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
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      if (initial) {
        setInitialLoading(false);
      } else {
        setIsLoadingMore(false);
        loadingMoreRef.current = false; // 🔓 UNLOCK
      }
    }
  },
  [channelId, userId, hasMore, nextCursor],
);


  useEffect(() => {
    if (!channelId || !userId) return;
didInitialScrollRef.current = false;
    setMessages([]);
    setNextCursor(null);
    setHasMore(true);

    loadMessages(true);
  }, [channelId, userId]);

useEffect(() => {
  if (!initialLoading) return;

  const el = containerRef.current;
  if (!el) return;

  // Only scroll to bottom on FIRST load
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
    didInitialScrollRef.current = true;
  });
}, [initialLoading]);

  
  useEffect(() => {
    if (!socket) return;

    const handlePinnedUpdate = ({ messageId, pinned }: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(messageId) ? { ...msg, pinned } : msg,
        ),
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


// useEffect(() => {
//   const el = containerRef.current;
//   if (!el) return;
//   console.log("SCROLL:", {
//   scrollTop: el.scrollTop,
//   clientHeight: el.clientHeight,
//   scrollHeight: el.scrollHeight,
// });


//   const onScroll = () => {
//     const nearBottom =
//       el.scrollHeight - el.scrollTop - el.clientHeight < 400;

//     // Only enable auto-scroll if user is near bottom
//     shouldAutoScrollRef.current = nearBottom;

//     // If user scrolls up near top → load older messages
//     if (el.scrollTop < 400) {
//       loadMessages(false);
//     }
//   };

//   el.addEventListener("scroll", onScroll);
//   return () => el.removeEventListener("scroll", onScroll);
// }, [loadMessages]);

// useEffect(() => {
//   const el = containerRef.current;
//   if (!el) return;

//   const onScroll = () => {
//     // 🚫 Do NOTHING until initial scroll positioning is complete
//     if (!didInitialScrollRef.current) return;

//     const nearBottom =
//       el.scrollHeight - el.scrollTop - el.clientHeight < 400;

//     shouldAutoScrollRef.current = nearBottom;

//     if (nearBottom) {
//       setHasNewMessages(false);
//       setHighlightedIds(new Set());
//     }

//     if (
//       el.scrollTop < 200 &&
//       !initialLoading &&
//       !isLoadingMore &&
//       hasMore
//     ) {
//       loadMessages(false);
//     }
//   };

//   el.addEventListener("scroll", onScroll);
//   return () => el.removeEventListener("scroll", onScroll);
// }, [loadMessages, initialLoading, isLoadingMore, hasMore]);


// useEffect(() => {
//   if (!topMessageRef.current) return;
//   if (!hasMore || isLoadingMore || initialLoading) return;

//   const observer = new IntersectionObserver(
//     (entries) => {
//       const first = entries[0];
//       if (first.isIntersecting) {
//         loadMessages(false); // 👈 fetch older messages
//       }
//     },
//     {
//       root: containerRef.current, // 👈 chat scroll container
//       threshold: 0.1, // smallest visibility
//     }
//   );

//   observer.observe(topMessageRef.current);

//   return () => observer.disconnect();
// }, [messages, hasMore, isLoadingMore, initialLoading, loadMessages]);

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
  // ⚠️ ONLY include refs or static flags, NOT `messages`
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
        fileMetadata = Array.isArray(res.data.files) ? res.data.files : [];
      }
    }

    // 1️⃣ Optimistically add message to UI
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

    // 2️⃣ Send to server
    socket.emit("sendMessage", {
      content,
      channel_id: Number(channelId),
      files: fileMetadata,
    });
  };

  function pinMessage(messageId: string | number) {
    if (!socket) return;
    socket.emit("pinMessage", { messageId, channel_id: Number(channelId) });
  }

  function shouldShowDateSeparator(messages: any[], index: number) {
    if (index === 0) return true;

    const currentDate = new Date(messages[index].created_at).toDateString();
    const previousDate = new Date(
      messages[index - 1].created_at,
    ).toDateString();

    return currentDate !== previousDate;
  }

  function unpinMessage(messageId: string | number) {
    if (!socket) return;
    socket.emit("unpinMessage", { messageId, channel_id: Number(channelId) });
  }

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
    files?: File[],
  ) {
    // const socket = socketRef.current;

    // optimistic update locally
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId)
          ? { ...m, content: newContent, updated_at: new Date().toISOString() }
          : m,
      ),
    );

    if (socket && socket.connected) {
      socket.emit("editMessage", {
        messageId,
        content: newContent,
        channel_id: Number(channelId),
      });
    } else {
      console.warn(
        "Socket not connected — edit will not be sent to server now.",
      );
    }

    setEditMessageId(null);
    setEditContent("");
  }

  function openEmojiPicker(messageId: string) {
    setShowEmojiPickerFor(messageId);
  }

  // function addEmojiToMessage(messageId: string | number, emoji: any) {
  //   if (!socket || !userId) {
  //     setShowEmojiPickerFor(null);
  //     return;
  //   }

  //   const selectedEmoji = emoji.native ?? emoji.colons ?? String(emoji);

  //   setMessages((prev) =>
  //     prev.map((msg) => {
  //       if (String(msg.id) !== String(messageId)) return msg;

  //       const reactions = msg.reactions
  //         ? msg.reactions.map((r) => ({
  //             ...r,
  //             users: Array.isArray(r.users) ? r.users : [],
  //           }))
  //         : [];

  //       const existing = reactions.find((r) => r.emoji === selectedEmoji);

  //       if (existing) {
  //         if (!existing.users.includes(userId)) {
  //           existing.users.push(userId);
  //           existing.count = existing.users.length;
  //         }
  //       } else {
  //         reactions.push({
  //           emoji: selectedEmoji,
  //           count: 1,
  //           users: [userId],
  //         });
  //       }

  //       return { ...msg, reactions };
  //     }),
  //   );

  //   socket.emit("reactMessage", { messageId, emoji: selectedEmoji });
  //   setShowEmojiPickerFor(null);
  // }

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
                if (
            existing.users &&
            !existing.users.some((u) => String(u.id) === String(userId))
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
    }),
  );

  try {
    socket.emit("reactMessage", { messageId, emoji: selectedEmoji });
  } catch (err) {
    console.error("Failed to emit reactMessage", err);
  }

  setShowEmojiPickerFor(null);
}


  function toggleReaction(messageId: string | number, emoji: string) {
    if (!socket || !userId) return;
    socket.emit("reactMessage", { messageId, emoji });
  }

  function handleChatAction(action: string, messageId: string) {
    const msg = messages.find((m) => String(m.id) === String(messageId));
    switch (action) {
      case "reaction":
        openEmojiPicker(messageId);
        break;
      case "reply":
        break;
      case "pin":
        if (!msg) return;
        if (msg.pinned) unpinMessage(messageId);
        else pinMessage(messageId);
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
      prev.filter((m) => String(m.id) !== String(messageId)),
    );
  }

 useEffect(() => {
  if (!messageBoxRef.current) return;

  const el = messageBoxRef.current;

  const ro = new ResizeObserver(() => {
    let height=getComputedStyle(document.documentElement).getPropertyValue("--main-header-height");
    let mainheight=document.querySelectorAll('header')[0]?.clientHeight;
    console.log("Message box height:", el.clientHeight);
    console.log("Main header height", mainheight);
  });

  ro.observe(el);

  return () => ro.disconnect();
}, []);
const handleScroll = () => {
  console.log("SCROLL FIRED");
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
      className="flex min-h-[100%] dark:bg-black  "
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="fixed top-0 left-0 w-full h-[100%] bg-black bg-opacity-50 flex items-center justify-center z-500 transition-opacity duration-300">
          <FileBg />
        </div>
      )}
      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-var(--main-header-height)-var(--chat-header-height)+33px)] "
        onScroll={handleScroll}
        ref={containerRef}
      >
        {hasNewMessages && (
          <div className="sticky top-2 z-50 flex justify-center">
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded-full shadow-md text-sm"
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setHasNewMessages(false);
                setHighlightedIds(new Set());
              }}
            >
              New messages ↓
            </button>
          </div>
        )}

        <div
          className="flex-1 py-6 bg-[var(--sidebar)] px-0 "
          style={{ scrollbarGutter: "stable" }}
        >
          {initialLoading && (
            <>
              <MessageSkeleton />
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          )}

          {/* When scrolling up and loading previous messages, show skeleton at top */}
          {!initialLoading && isLoadingMore && (
            <div className="mb-2">
              <MessageSkeleton />
              <MessageSkeleton />
            </div>
          )}
          {messages?.map((msg, index) => {
            const msgId = String(msg.id);
            const isHighlighted = highlightedIds.has(msgId);
            const prev = messages[index - 1];
            const showAvatar =
              !prev ||
              prev.sender_id !== msg.sender_id ||
              shouldShowDateSeparator(messages, index);

            return (
              <div
                key={msgId}
                ref={index === 0 ? topMessageRef : null} 
                className={` py-0 relative flex justify-start group/message !px-[25px] items-center gap-3 
                  ${msg.pinned ? "pinned bg-amber-100" : "hover:bg-gray-100"}
                  ${isHighlighted ? "bg-red-200 animate-pulse" : ""}
                  ${shouldShowDateSeparator(messages, index) && "border-t"} `}
                onMouseEnter={() => setHoveredId(msgId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* {hoveredId === msgId && msg.self && (
                  <ChatHover messageId={msgId} onAction={handleChatAction} />
                )} */}
                {msg.pinned && (
                  <span className="absolute top-0 right-0 text-blue-500 text-sm">
                    <TbPinFilled size={20} className="text-amber-400" />
                  </span>
                )}
                <div
                  className={`py-0 rounded-xl items-start flex flex-col gap-0 relative ${showAvatar ? "pt-1 pb-1" : ""}`}
                >
                  {showAvatar && (
                    <div className="grid grid-cols-1 md:grid-cols-[max-content_max-content] grid-rows-2 gap-x-2">
                      <img
                        src={
                          msg.avatar_url != null
                            ? `/avatar/${msg.avatar_url}`
                            : "/avatar/fallback.webp"
                        }
                        alt="avatar"
                        className="w-8 h-8 rounded-sm object-cover shrink-0 row-span-2 aspect-square"
                      />
                      <div className="flex flex-row gap-1 items-center">
                        {msg.sender_name && (
                          <span className="text-sm font-bold self-center">
                            {msg.sender_name}
                          </span>
                        )}

                        {msg.sender_name && (
                          <div className="flex items-center gap-2">
                            {msg.created_at && (
                              <span className="text-[10px] opacity-60 whitespace-nowrap">
                                {new Date(msg.created_at).toLocaleString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  },
                                )}

                                {msg.updated_at &&
                                  msg.updated_at !== msg.created_at && (
                                    <span className="italic text-[10px]  ml-1 line">
                                      (edited)
                                    </span>
                                  )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className="leading-none leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.content),
                        }}
                      />
                    </div>
                  )}

                  <div className="relative">
                    <div
                      className={`rounded-md ms-[40px] w-fit flex flex-col ${msg.reactions && msg.reactions.length > 0 ? "mb-2" : ""}`}
                    >
                      <div
                        className={`leading-none leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message ${showAvatar ? "hidden" : ""}`}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.content),
                        }}
                      />
                      {msg.files?.length ? (
                        <div className="flex gap-2 mt-2 ">
                          {msg.files.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              className="aspect-square h-[100px] w-[100px]"
                            >
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={file.url}
                                  className="w-full rounded border object-cover h-full"
                                />
                              ) : (
                                <div className="p-2 border rounded text-sm">
                                  📎 {file.name}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      ) : null}

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
                                  {(r.users ?? []).map((u, j) => (
                                    <div key={j}>{u.name}</div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
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

                  {!showAvatar && msg.created_at && (
                    <div
                      className="text-[10px] top-[calc(calc(var(--spacing)*1)+0.08rem)] left-0 -translate-x-[0.5rem]  opacity-60 absolute flex-col  hidden group-hover/message:block
                          whitespace-nowrap flex items-center gap-0"
                    >
                      {new Date(msg.created_at).toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })}

                      {/* 👇 Show "edited" only if the message was edited */}
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
                        onEmojiSelect={(emoji: any) =>
                          addEmojiToMessage(msgId, emoji)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {hoveredId === msgId && (
                  <ChatHover
                    messageId={msgId}
                    pinned={msg.pinned}
                    isSelf={msg.self}
                    onAction={handleChatAction}
                  />
                )}

                {shouldShowDateSeparator(messages, index) && (
                  <Dateseparator date={msg.created_at} />
                )}
              </div>
            );
          })}
        </div>
        <div className="pb-2 px-[25px] pt-0 relative sticky bottom-0 right-0 bg-[var(--sidebar)] dark:bg-zinc-900 " ref={messageBoxRef}>
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
        <div ref={bottomRef} />
      </main>
    </div>
  );
}
