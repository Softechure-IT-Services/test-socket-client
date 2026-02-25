"use client";

import * as React from "react";
import api from "@/lib/axios";
import {
  Frame,
  Map,
  PieChart,
} from "lucide-react";
import { HiHashtag } from "react-icons/hi";
import { IoChatbubblesOutline } from "react-icons/io5";

import { NavMain } from "@/app/components/nav-main";
import { NavProjects } from "@/app/components/nav-projects";
import { NavUser } from "@/app/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/app/components/ui/sidebar";
import CreateModal from "@/app/components/modals/CreateNew";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { usePathname, useRouter } from "next/navigation";
import { UserType } from "@/app/components/context/userId_and_connection/provider";
import { useUnread } from "@/app/components/context/UnreadContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const { user, socket } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");

  // Unread counts come from shared context
  const { unreadCounts, seedFromStorage, incrementUnread, clearUnread } = useUnread();

  // Push notifications
  const { requestPermission, showNotification } = usePushNotifications();

  const pathname = usePathname();
  const router = useRouter();

  // ─── Derive active channel from URL ─────────────────────────────────────────
  const currentChannelId = React.useMemo(() => {
    const match = pathname?.match(/^\/channel\/(\d+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Keep a ref so the socket handler doesn't capture a stale closure
  const currentChannelIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
    // Clear unread when the user navigates into a channel
    if (currentChannelId) clearUnread(currentChannelId);
  }, [currentChannelId, clearUnread]);

  // ─── Request notification permission once on mount ───────────────────────────
  React.useEffect(() => {
    if (!user) return;
    // Only ask if not already decided
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Small delay — don't ask immediately on page load
        const t = setTimeout(() => requestPermission(), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [user, requestPermission]);

  // ─── Listen for newMessageNotification on the user's personal socket room ────
  //
  // WHY THIS WORKS:
  //   Every connected socket is auto-joined to `user_${id}` in index.js.
  //   That room never changes regardless of which channel the user is viewing.
  //   The server now emits `newMessageNotification` to each member's user room
  //   whenever a message is sent, so the sidebar ALWAYS receives it.
  //
  //   We no longer need to re-join channel rooms or fight ChannelChat's
  //   leaveChannel cleanup. The receiveMessage listener on the sidebar is removed.
  //
  React.useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (notification: {
      channel_id: string | number;
      message_id: string | number;
      sender_id: string | number;
      sender_name: string;
      avatar_url?: string;
      preview: string;
      channel_name: string | null;
      is_dm: boolean;
      created_at: string;
    }) => {
      const channelId = String(notification.channel_id);

      // Skip if the user is currently viewing this channel
      if (currentChannelIdRef.current === channelId) return;

      // Increment badge in context + localStorage
      incrementUnread(channelId);

      // Show browser push notification
      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      showNotification({
        title: channelLabel,
        body: `${notification.is_dm ? "" : `${notification.sender_name}: `}${notification.preview || "New message"}`,
        icon: notification.avatar_url,
        channelId,
      });
    };

    // ── Thread reply notifications ────────────────────────────────────────────
    // Same pattern: server emits to user_${id} room, sidebar catches it here.
    // We reuse the same badge increment + push notification path.
    const handleThreadNotification = (notification: {
      channel_id: string | number;
      channel_name: string | null;
      is_dm: boolean;
      parent_message_id: string | number;
      sender_id: string | number;
      sender_name: string;
      avatar_url?: string;
      preview: string;
      created_at: string;
    }) => {
      const channelId = String(notification.channel_id);

      // Skip if the user is actively viewing this channel (they can see the badge on the message)
      if (currentChannelIdRef.current === channelId) return;

      // Increment the channel's sidebar badge
      incrementUnread(channelId);

      // Push notification — label it clearly as a thread reply
      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      showNotification({
        title: `${notification.sender_name} replied in ${channelLabel}'s thread`,
        body: notification.preview || "New thread reply",
        icon: notification.avatar_url,
        channelId,
      });
    };

    socket.on("newMessageNotification", handleNotification);
    socket.on("newThreadNotification", handleThreadNotification);
    return () => {
      socket.off("newMessageNotification", handleNotification);
      socket.off("newThreadNotification", handleThreadNotification);
    };
  }, [socket, user, incrementUnread, showNotification]);
  // Note: currentChannelId is intentionally NOT in deps — we use the ref instead
  // so this effect never re-registers on navigation, avoiding any listener gaps.

  // ─── Initial data fetch + seed unread from localStorage ──────────────────────
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const ch = await api.get(`/channels?get_dms=false`);
        const channelList = ch.data.map((c: any) => ({
          id: c.id,
          title: c.name,
          url: `/channel/${c.id}`,
          is_private: c.is_private,
          is_dm: c.is_dm,
        }));
        setChannels(channelList);

        const dm = await api.get(`/dm`);
        const userList = dm.data.map((d: any) => ({
          title: d.name,
          url: `/channel/${d.id}`,
          avatar: d.avatar_url,
          id: d.id,
        }));
        setUsers(userList);

        // Seed unread counts from localStorage for all channels + DMs
        const allIds = [
          ...channelList.map((c: any) => String(c.id)),
          ...userList.map((u: any) => String(u.id)),
        ];
        seedFromStorage(allIds);
      } catch (err) {
        console.error("Sidebar fetch error:", err);
      }
    };
    fetchData();
  }, [seedFromStorage]);

  // ─── Channel created ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket) return;
    const handler = (channel: any) => {
      setChannels((prev) => {
        if (prev.some((ch) => String(ch.id) === String(channel.id))) return prev;
        return [
          {
            id: channel.id,
            title: channel.name,
            url: `/channel/${channel.id}`,
            is_private: channel.isPrivate ?? channel.is_private,
            is_dm: false,
          },
          ...prev,
        ];
      });
    };
    socket.on("channelCreated", handler);
    return () => { socket.off("channelCreated", handler); };
  }, [socket]);

  // ─── DM created ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket || !user) return;
    const dmHandler = async () => {
      const dm = await api.get(`/dm`);
      setUsers(
        dm.data.map((d: any) => ({
          title: d.name,
          url: `/channel/${d.id}`,
          avatar: d.avatar_url,
          id: d.id,
        }))
      );
    };
    socket.on("dmCreated", dmHandler);
    return () => { socket.off("dmCreated", dmHandler); };
  }, [socket, user]);

  // ─── Removed / Added from channel ────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket) return;

    const handleRemovedFromChannel = (data: { channelId: number; channelName?: string }) => {
      setChannels((prev) => prev.filter((ch) => String(ch.id) !== String(data.channelId)));
      if (currentChannelId && String(currentChannelId) === String(data.channelId)) {
        router.push("/");
      }
    };

    const handleAddedToChannel = (data: { channelId: number; channel?: any }) => {
      if (data.channel) {
        setChannels((prev) => {
          if (prev.some((ch) => String(ch.id) === String(data.channel.id))) return prev;
          return [
            {
              id: data.channel.id,
              title: data.channel.name,
              url: `/channel/${data.channel.id}`,
              is_private: data.channel.is_private,
              is_dm: false,
            },
            ...prev,
          ];
        });
      } else {
        api.get(`/channels?get_dms=false`).then((res) => {
          setChannels(
            res.data.map((c: any) => ({
              id: c.id,
              title: c.name,
              url: `/channel/${c.id}`,
              is_private: c.is_private,
              is_dm: c.is_dm,
            }))
          );
        });
      }
    };

    socket.on("removedFromChannel", handleRemovedFromChannel);
    socket.on("addedToChannel", handleAddedToChannel);
    return () => {
      socket.off("removedFromChannel", handleRemovedFromChannel);
      socket.off("addedToChannel", handleAddedToChannel);
    };
  }, [socket, currentChannelId, router]);

  const handleAddChannel = () => { setModalType("channel"); setModalOpen(true); };
  const handleAddDM = () => { setModalType("dm"); setModalOpen(true); };

  const navMain = [
    {
      title: "Channels",
      url: "#",
      type: "channel",
      icon: HiHashtag,
      isActive: true,
      items: channels.map((ch) => ({
        ...ch,
        unread: unreadCounts[String(ch.id)] ?? 0,
      })),
      onAdd: handleAddChannel,
    },
    {
      title: "Direct Messages",
      url: "#",
      type: "dm",
      icon: IoChatbubblesOutline,
      isActive: true,
      items: users.map((u) => {
        const match = u.url?.match(/\/channel\/(\d+)/);
        const chId = match ? match[1] : null;
        return {
          ...u,
          unread: chId ? (unreadCounts[chId] ?? 0) : 0,
        };
      }),
      onAdd: handleAddDM,
    },
  ];

  const projects = [
    { name: "Threads", url: "/threads", icon: Frame },
    { name: "Calls", url: "/calls", icon: PieChart },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavProjects projects={projects} />
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user as UserType} />}
      </SidebarFooter>
      <SidebarRail />
      <CreateModal
        open={modalOpen}
        type={modalType}
        onClose={() => setModalOpen(false)}
      />
    </Sidebar>
  );
}