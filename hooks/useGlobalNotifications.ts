// hooks/useGlobalNotifications.ts
"use client";

import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";

export function useGlobalNotifications({
  socket,
  userId,
  activeChannelId,
}: {
  socket: any;
  userId: string | number | null | undefined;
  activeChannelId: string | number | null | undefined;
}) {
  const { showNotification } = usePushNotifications();

  useEffect(() => {
    if (!socket || !userId) return;

// useGlobalNotifications.ts
const handleReceive = (msg: any) => {
  if (String(msg.sender_id) === String(userId)) return;
  if (String(msg.channel_id) === String(activeChannelId)) return; // already handled by ChannelChat

  showNotification({
    title: msg.sender_name ?? "New message",
    body: msg.content?.replace(/<[^>]+>/g, "").slice(0, 100) ?? "",
    channelId: msg.channel_id,
    force: true, // ← tab may be visible but user is on a different channel
  });
};

    socket.on("receiveMessage", handleReceive);
    return () => socket.off("receiveMessage", handleReceive);
  }, [socket, userId, activeChannelId, showNotification]);
}