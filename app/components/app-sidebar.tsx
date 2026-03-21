"use client";

import * as React from "react";
import api from "@/lib/axios";
import { Frame, PieChart } from "lucide-react";
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
import { usePresence } from "@/app/components/context/PresenceContext";
import {
  incrementStoredMentionCount,
  clearStoredMentionCount,
  getStoredMentionCount,
  // Reuse the generic unread helpers with the special key "threads"
  getStoredUnread,
  incrementStoredUnread,
  clearStoredUnread,
} from "@/hooks/useLastRead";

// ─── Types ─────────────────────────────────────────────────────────────────

/** Shape emitted by the server for @mention events */
type MentionNotification = {
  channel_id: string | number;
  channel_name: string | null;
  is_dm: boolean;
  message_id: string | number;
  sender_id: string | number;
  sender_name: string;
  avatar_url?: string;
  /** Plain-text preview of the message that contains the mention */
  preview: string;
  created_at: string;
};

// The special localStorage key used for cross-session thread unread persistence
const THREAD_UNREAD_KEY = "threads" as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const { user, socket } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");

  const { unreadCounts, seedFromStorage, incrementUnread, clearUnread } = useUnread();
  const { requestPermission, showNotification } = usePushNotifications();
  const { seedUsers } = usePresence();

  // ─── Mention counts (channelId → count) ─────────────────────────────────
  const [mentionCounts, setMentionCounts] = React.useState<Record<string, number>>({});

  const incrementMention = React.useCallback((channelId: string) => {
    const next = incrementStoredMentionCount(channelId);
    setMentionCounts((prev) => ({ ...prev, [channelId]: next }));
  }, []);

  const clearMention = React.useCallback((channelId: string) => {
    clearStoredMentionCount(channelId);
    setMentionCounts((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  /** Seed mention counts from localStorage (called once channels/DMs are loaded) */
  const seedMentionsFromStorage = React.useCallback((ids: string[]) => {
    const initial: Record<string, number> = {};
    for (const id of ids) {
      const n = getStoredMentionCount(id);
      if (n > 0) initial[id] = n;
    }
    if (Object.keys(initial).length > 0) {
      setMentionCounts((prev) => ({ ...prev, ...initial }));
    }
  }, []);

  // ─── Thread unread count (for the Threads nav item) ─────────────────────
  // Persisted under the key "threads" in localStorage so it survives refresh.
  const [threadUnreadCount, setThreadUnreadCount] = React.useState<number>(0);

  // Seed on mount from localStorage
  React.useEffect(() => {
    const stored = getStoredUnread(THREAD_UNREAD_KEY);
    if (stored > 0) setThreadUnreadCount(stored);
  }, []);

  const pathname = usePathname();
  const router = useRouter();

  // ─── Derive active channel/DM id from URL ───────────────────────────────
  const currentChannelId = React.useMemo(() => {
    const match = pathname?.match(/^\/(?:channel|dm)\/(\d+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const currentChannelIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
    if (currentChannelId) {
      clearUnread(currentChannelId);
      clearMention(currentChannelId);
    }
  }, [currentChannelId, clearUnread, clearMention]);

  // Clear thread unread when the user navigates to /threads
  React.useEffect(() => {
    if (pathname === "/threads") {
      clearStoredUnread(THREAD_UNREAD_KEY);
      setThreadUnreadCount(0);
    }
  }, [pathname]);

  // ─── Request notification permission once after login ───────────────────
  React.useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const t = setTimeout(() => requestPermission(), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [user, requestPermission]);

  // ─── Socket: regular message + thread notifications ──────────────────────
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
      if (currentChannelIdRef.current === channelId) return;

      incrementUnread(channelId);

      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      showNotification({
        title: channelLabel,
        body: `${notification.is_dm ? "" : `${notification.sender_name}: `}${notification.preview || "New message"}`,
        icon: notification.avatar_url,
        channelId,
        force: true,
      });
    };

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

      // ── 1. Increment the channel's own unread badge (user isn't viewing it) ──
      if (currentChannelIdRef.current !== channelId) {
        incrementUnread(channelId);
      }

      // ── 2. Increment the Threads nav item badge (only when not on /threads) ──
      if (typeof window !== "undefined" && window.location.pathname !== "/threads") {
        const next = incrementStoredUnread(THREAD_UNREAD_KEY);
        setThreadUnreadCount(next);
      }

      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      showNotification({
        title: `${notification.sender_name} replied in ${channelLabel}'s thread`,
        body: notification.preview || "New thread reply",
        icon: notification.avatar_url,
        channelId,
        force: true,
      });
    };

    socket.on("newMessageNotification", handleNotification);
    socket.on("newThreadNotification", handleThreadNotification);
    return () => {
      socket.off("newMessageNotification", handleNotification);
      socket.off("newThreadNotification", handleThreadNotification);
    };
  }, [socket, user, incrementUnread, showNotification]);

  // ─── Socket: @mention notifications ──────────────────────────────────────
  React.useEffect(() => {
    if (!socket || !user) return;

    const handleMention = (notification: MentionNotification) => {
      const channelId = String(notification.channel_id);
      if (currentChannelIdRef.current === channelId) return;

      incrementMention(channelId);
      incrementUnread(channelId);

      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      showNotification({
        title: `${notification.sender_name} mentioned you in ${channelLabel}`,
        body: notification.preview || "You were mentioned",
        icon: notification.avatar_url,
        channelId,
        force: true,
      });
    };

    socket.on("newMentionNotification", handleMention);
    return () => { socket.off("newMentionNotification", handleMention); };
  }, [socket, user, incrementMention, incrementUnread, showNotification]);

  // ─── Initial data fetch ──────────────────────────────────────────────────
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
          id: d.id,
          title: d.name,
          url: `/dm/${d.id}`,
          avatar_url: d.avatar_url ?? null,
          target_user_id: d.other_user_id ?? null,
          is_online: d.is_online ?? false,
          last_seen: d.last_seen ?? null,
        }));
        setUsers(userList);
        seedUsers(
          dm.data
            .map((d: any) => ({
              id: d.other_user_id ?? null,
              is_online: d.is_online,
              last_seen: d.last_seen,
            }))
            .filter((entry: any) => entry.id !== null)
        );

        const allIds = [
          ...channelList.map((c: any) => String(c.id)),
          ...userList.map((u: any) => String(u.id)),
        ];
        seedFromStorage(allIds);
        seedMentionsFromStorage(allIds);
      } catch (err) {
        console.error("Sidebar fetch error:", err);
      }
    };
    fetchData();
  }, [seedFromStorage, seedMentionsFromStorage, seedUsers]);

  // ─── Socket: channel created ─────────────────────────────────────────────
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

  // ─── Socket: DM created ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket || !user) return;

    const dmHandler = async (data: any) => {
      if (data?.channel_id && data?.members) {
        const otherMember = data.members.find(
          (m: any) => String(m.id) !== String(user.id)
        );
        if (otherMember) {
          seedUsers(data.members ?? []);
          const newDm = {
            id: data.channel_id,
            title: otherMember.name,
            url: `/dm/${data.channel_id}`,
            avatar_url: otherMember.avatar_url ?? null,
            target_user_id: otherMember.id ?? null,
            is_online: otherMember.is_online ?? false,
            last_seen: otherMember.last_seen ?? null,
          };
          setUsers((prev) => {
            if (prev.some((u) => String(u.id) === String(data.channel_id))) return prev;
            return [newDm, ...prev];
          });
          seedFromStorage([String(data.channel_id)]);
          seedMentionsFromStorage([String(data.channel_id)]);
          return;
        }
      }
      const dm = await api.get(`/dm`);
      const userList = dm.data.map((d: any) => ({
        id: d.id,
        title: d.name,
        url: `/dm/${d.id}`,
        avatar_url: d.avatar_url ?? null,
        target_user_id: d.other_user_id ?? null,
        is_online: d.is_online ?? false,
        last_seen: d.last_seen ?? null,
      }));
      setUsers(userList);
      seedUsers(
        dm.data
          .map((d: any) => ({
            id: d.other_user_id ?? null,
            is_online: d.is_online,
            last_seen: d.last_seen,
          }))
          .filter((entry: any) => entry.id !== null)
      );
      const ids = userList.map((u: any) => String(u.id));
      seedFromStorage(ids);
      seedMentionsFromStorage(ids);
    };

    socket.on("dmCreated", dmHandler);
    return () => { socket.off("dmCreated", dmHandler); };
  }, [socket, user, seedFromStorage, seedMentionsFromStorage, seedUsers]);

  // ─── Socket: User Profile Updated ────────────────────────────────────────
  React.useEffect(() => {
    if (!socket) return;
    const handleUserUpdated = () => {
      api.get(`/dm`).then((res) => {
        const userList = res.data.map((d: any) => ({
          id: d.id,
          title: d.name,
          url: `/dm/${d.id}`,
          avatar_url: d.avatar_url ?? null,
          target_user_id: d.other_user_id ?? null,
          is_online: d.is_online ?? false,
          last_seen: d.last_seen ?? null,
        }));
        setUsers(userList);
        seedUsers(
          res.data
            .map((d: any) => ({
              id: d.other_user_id ?? null,
              is_online: d.is_online,
              last_seen: d.last_seen,
            }))
            .filter((entry: any) => entry.id !== null)
        );
      }).catch((err) => console.error("Sidebar user sync error:", err));
    };
    socket.on("userUpdated", handleUserUpdated);
    return () => { socket.off("userUpdated", handleUserUpdated); };
  }, [socket, seedUsers]);

  // ─── Socket: removed / added from channel ───────────────────────────────
  React.useEffect(() => {
    if (!socket) return;

    const handleRemovedFromChannel = (data: { channelId: number; channelName?: string }) => {
      setChannels((prev) => prev.filter((ch) => String(ch.id) !== String(data.channelId)));
      if (currentChannelId && String(currentChannelId) === String(data.channelId)) {
        router.push("/");
      }
    };

    const handleUserLeftChannel = (data: { channelId: number; userId: number | string }) => {
      if (String(data.userId) !== String(user?.id)) return;
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
    socket.on("userLeftChannel", handleUserLeftChannel);
    return () => {
      socket.off("removedFromChannel", handleRemovedFromChannel);
      socket.off("addedToChannel", handleAddedToChannel);
      socket.off("userLeftChannel", handleUserLeftChannel);
    };
  }, [socket, currentChannelId, router, user]);

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
        mentions: mentionCounts[String(ch.id)] ?? 0,
      })),
      onAdd: handleAddChannel,
    },
    {
      title: "Direct Messages",
      url: "#",
      type: "dm",
      icon: IoChatbubblesOutline,
      isActive: true,
      items: users.map((u) => ({
        ...u,
        unread: unreadCounts[String(u.id)] ?? 0,
        mentions: mentionCounts[String(u.id)] ?? 0,
      })),
      onAdd: handleAddDM,
    },
  ];

  const projects = [
    { name: "Threads", url: "/threads", icon: Frame, unread: threadUnreadCount },
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
