// // hooks/useGlobalNotifications.ts
// "use client";

// import { useEffect } from "react";
// import { usePushNotifications } from "./usePushNotifications";

// export function useGlobalNotifications({
//   socket,
//   userId,
//   activeChannelId,
// }: {
//   socket: any;
//   userId: string | number | null | undefined;
//   activeChannelId: string | number | null | undefined;
// }) {
//   const { showNotification } = usePushNotifications();

//   useEffect(() => {
//     if (!socket || !userId) return;

// // useGlobalNotifications.ts
// // const handleReceive = (msg: any) => {
// //   if (String(msg.sender_id) === String(userId)) return;
// //   if (String(msg.channel_id) === String(activeChannelId)) return; // already handled by ChannelChat

// //   showNotification({
// //     title: msg.sender_name ?? "New message",
// //     body: msg.content?.replace(/<[^>]+>/g, "").slice(0, 100) ?? "",
// //     channelId: msg.channel_id,
// //     force: true, // ← tab may be visible but user is on a different channel
// //   });
// // };

// const handleReceive = (msg: any) => {
//   if (String(msg.sender_id) === String(userId)) return;
//   if (String(msg.channel_id) === String(activeChannelId)) return;

//   showNotification({
//     title: msg.sender_name ?? "New message",
//     body: (msg.content ?? "")
//       .replace(/<[^>]+>/g, " ")
//       .replace(/&nbsp;/g, " ")
//       .replace(/\s+/g, " ")
//       .trim()
//       .slice(0, 100),
//     channelId: msg.channel_id,
//     force: true,
//   });
// };

//     socket.on("receiveMessage", handleReceive);
//     return () => socket.off("receiveMessage", handleReceive);
//   }, [socket, userId, activeChannelId, showNotification]);
// }

// hooks/useGlobalNotifications.ts
"use client";

import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { incrementStoredUnread, clearStoredUnread } from "./useLastRead";

export type UnreadMap = Record<string, number>; // channelId → count

export function useGlobalNotifications({
  socket,
  userId,
  activeChannelId,
  onUnreadChange,
}: {
  socket: any;
  userId: string | number | null | undefined;
  activeChannelId: string | number | null | undefined;
  /** Called whenever an unread count changes so the sidebar can re-render */
  onUnreadChange: (channelId: string, count: number) => void;
}) {
  const { showNotification } = usePushNotifications();

  useEffect(() => {
    if (!socket || !userId) return;

    // ── 1. Cross-channel notifications (user is NOT in this channel room) ──
    // Fired by _notifyChannelMembers → user_${id} personal room
    const handleNotification = (msg: any) => {
      const cid = String(msg.channel_id);
      const isActive = String(activeChannelId) === cid;

      if (isActive) {
        // They're looking at this channel — clear any stale count
        clearStoredUnread(cid);
        onUnreadChange(cid, 0);
        return;
      }

      // Increment persisted count and tell the sidebar
      const next = incrementStoredUnread(cid);
      onUnreadChange(cid, next);

      // Also fire a browser push notification
      showNotification({
        title: msg.sender_name ?? "New message",
        body: (msg.preview ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100),
        channelId: msg.channel_id,
        force: true,
      });
    };

    // ── 2. Same-channel messages (user IS in the channel room) ──────────────
    // receiveMessage still fires for the active channel; use it to clear badge.
    const handleReceive = (msg: any) => {
      const cid = String(msg.channel_id);
      if (String(activeChannelId) === cid) {
        clearStoredUnread(cid);
        onUnreadChange(cid, 0);
      }
    };

    socket.on("newMessageNotification", handleNotification);
    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.off("newMessageNotification", handleNotification);
      socket.off("receiveMessage", handleReceive);
    };
  }, [socket, userId, activeChannelId, onUnreadChange, showNotification]);
}