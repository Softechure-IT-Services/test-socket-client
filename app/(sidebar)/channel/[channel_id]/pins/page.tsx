"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { useParams, useRouter } from "next/navigation";
import axios from "@/lib/axios";

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
}

export default function PinnedMessages() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.channel_id;

  const [messages, setMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    const fetchPinnedMessages = async () => {
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

    fetchPinnedMessages();
  }, [channelId]);

  /**
   * Navigate to the chat tab and scroll to the specific message.
   * We use a URL hash: /channels/<id>/chat#msg-<messageId>
   * ChannelChat renders each message with id="msg-<messageId>",
   * so the browser will auto-scroll on load, and we also do a
   * manual scrollIntoView + highlight in case the tab is already open.
   */
  /**
   * Navigate to the channel's root page (where ChannelChat lives)
   * and pass the target message ID via a query param.
   * ChannelChat reads ?scrollTo=<id> on mount and scrolls + highlights.
   */
  const handleMessageClick = (messageId: number) => {
    router.push(`/channel/${channelId}?scrollTo=${messageId}`);
  };

  if (loading)
    return (
      <div className="max-w-5xl mx-auto space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );

  if (messages.length === 0)
    return <p className="p-6 text-gray-500">No pinned messages.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {messages.map((msg) => (
        <div
          key={msg.message_id}
          onClick={() => handleMessageClick(msg.message_id)}
          className="border rounded-xl p-4 shadow-sm bg-white cursor-pointer
                     hover:border-blue-400 hover:shadow-md hover:bg-blue-50/40
                     transition-all duration-150 group"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="p-4 h-10 w-10 rounded-md bg-green-600 text-white flex items-center justify-center font-semibold text-lg shrink-0">
              {msg.sender.name[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-black">{msg.sender.name}</p>
                {/* "Jump to message" hint */}
                <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Jump to message →
                </span>
              </div>

              <p className="text-gray-500 text-sm">
                {new Date(msg.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <div
                className="mt-2 text-gray-700 line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(msg.content),
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}