"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { TbPinFilled } from "react-icons/tb";
import { MessageRow, MessageSkeleton, type MessageRowData } from "@/app/components/MessageRow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sender {
  id: number;
  name: string;
  avatar_url?: string | null;
}

interface PinnedMessage {
  message_id: number;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  sender: Sender;
  files?: {
    id?: number | string;
    url: string;
    name: string;
    type: string;
    size?: number;
    path?: string;
  }[];
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPins() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-800/40">
        <TbPinFilled size={28} className="text-amber-400" />
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No pinned messages</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-[220px]">
        Pin important messages in chat to find them quickly here
      </p>
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

export default function PinnedMessages() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.channel_id;

  const [messages, setMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;
    const fetch = async () => {
      try {
        const res = await axios.get(`/channels/${channelId}/pinned`);
        if (res.data.success) {
          setMessages(res.data.data.pinned_messages);
        }
      } catch (err) {
        console.error("Failed to fetch pinned messages:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [channelId]);

  const handleJump = useCallback(
    (messageId: number) => {
      router.push(`/channel/${channelId}?scrollTo=${messageId}`);
    },
    [channelId, router]
  );

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
          >
            <div className="h-8 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100/60 dark:border-amber-800/20" />
            <MessageSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) return <EmptyPins />;

  return (
    <div className="p-4 space-y-3">
      {/* Count header */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <TbPinFilled size={14} className="text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Pinned Messages
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
          {messages.length}
        </span>
      </div>

      {/* Pinned message cards */}
      {messages.map((msg) => {
        // Build a MessageRowData-compatible object
        const rowData: MessageRowData = {
          id: msg.message_id,
          sender_id: msg.sender.id,
          sender_name: msg.sender.name,
          avatar_url: msg.sender.avatar_url ?? null,
          content: msg.content,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          pinned: true,
          files: msg.files ?? [],
        };

        return (
          <div
            key={msg.message_id}
            className="
              group/card rounded-2xl border dark:border-amber-800/30
              bg-white dark:bg-zinc-900
              overflow-hidden
              transition-all duration-150
              cursor-pointer
            "
            onClick={() => handleJump(msg.message_id)}
          >

            {/* MessageRow — read-only (isMember=false hides ChatHover) */}
            <MessageRow
              msg={rowData}
              showHeader={true}
              isMember={false}
            />
          </div>
        );
      })}
    </div>
  );
}