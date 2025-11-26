"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import MessageInput from "@/components/custom/MessageInput";
import DOMPurify from "dompurify";

type ChatMessage = {
  id?: number | string;
  sender_id: string;
  content: string;
  self: boolean;
  created_at?: string | null;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [tempUserId, setTempUserId] = useState<string>(""); // join only on click
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.1.14:5000";

  // Create socket after userId is set (so we can pass userId in auth)
  useEffect(() => {
    if (!userId) return;

    // establish socket connection and pass userId in auth
    const s = io(SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { userId },
    });
    socketRef.current = s;

    const handleReceive = (msg: any) => {
      // construct ChatMessage
      const chatMsg: ChatMessage = {
        id: msg.id,
        sender_id: msg.sender_id,
        content: msg.content,
        self: msg.sender_id === userId,
        created_at: msg.created_at ?? null,
      };

      // dedupe by id and append then sort chronological
      setMessages((prev) => {
        if (chatMsg.id != null && prev.some((m) => String(m.id) === String(chatMsg.id))) {
          return prev;
        }
        const next = [...prev, chatMsg].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        });
        return next;
      });
    };

    const handleAck = (msg: any) => {
      const chatMsg: ChatMessage = {
        id: msg.id,
        sender_id: msg.sender_id,
        content: msg.content,
        self: true,
        created_at: msg.created_at ?? null,
      };

      setMessages((prev) => {
        if (chatMsg.id != null && prev.some((m) => String(m.id) === String(chatMsg.id))) {
          return prev;
        }
        const next = [...prev, chatMsg].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        });
        return next;
      });
    };

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("receiveMessage", handleReceive);
    s.on("messageAck", handleAck);

    return () => {
      s.off("receiveMessage", handleReceive);
      s.off("messageAck", handleAck);
      s.off("connect");
      s.off("disconnect");
      s.close();
      socketRef.current = null;
    };
  }, [userId, SERVER_URL]);

  // Fetch message history once userId is known
  useEffect(() => {
    if (!userId) return;

    fetch(`${SERVER_URL}/messages`)
      .then((res) => res.json())
      .then((data: any[]) => {
        const mapped: ChatMessage[] = data
          .map((msg: any) => ({
            id: msg.id,
            sender_id: msg.sender_id,
            content: msg.content,
            self: msg.sender_id == userId ,
            created_at: msg.created_at ?? null,
          }))
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
  }, [userId, SERVER_URL]);

  // auto-scroll to bottom when messages change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // small timeout to let DOM update
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  const handleSendMessage = (content: string) => {
    if (!userId) return alert("Set your user ID first!");
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return alert("Socket not connected yet.");
    }

    // Optionally optimistic UI: create a temporary local message (without id) — but here we wait for ack
    socket.emit("sendMessage", { content, sender_id: userId });
  };

  const handleJoin = () => {
    if (!tempUserId.trim()) return alert("Please enter a valid ID");
    setUserId(tempUserId.trim());
  };

  // UI: ask user to join
  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your unique ID"
            className="p-2 border rounded"
            value={tempUserId}
            onChange={(e) => setTempUserId(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleJoin}
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100%] dark:bg-black">
      <main className="flex flex-col flex-1">
        <div className="flex items-center justify-between px-6 py-4 border-y sticky top-[56px] right-0  bg-[var(--background)] text-[var(--foreground)] z-10">
          <h2>{userId}</h2>
          <span>{connected ? "Online" : "Connecting..."}</span>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
          style={{ scrollbarGutter: "stable" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id ?? `${msg.sender_id}-${msg.created_at ?? Math.random()}`}
              className={`flex ${msg.self ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-xl max-w-xs break-words ${
                  msg.self ? "bg-black text-white" : "bg-zinc-200"
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(msg.content),
                  }}
                />
                {/* optional small timestamp */}
                {msg.created_at ? (
                  <div className="text-xs mt-1 opacity-60 text-right">
                    {new Date(msg.created_at).toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 sticky bottom-0 right-0 bg-white dark:bg-zinc-900 border-t">
          <MessageInput onSend={handleSendMessage} />
        </div>
      </main>
    </div>
  );
}
