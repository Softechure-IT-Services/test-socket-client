"use client";

import * as React from "react";
import api from "@/lib/axios";
import { Frame, PhoneCall } from "lucide-react";
import { HiHashtag } from "react-icons/hi";
import { IoChatbubblesOutline } from "react-icons/io5";

import { NavMain } from "@/app/components/nav-main";
import { NavProjects } from "@/app/components/nav-projects";
import { NavUser } from "@/app/components/nav-user";
import { HuddleInviteToast } from "@/app/components/HuddleInviteToast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/app/components/ui/sidebar";

import CreateModal from "@/app/components/modals/CreateNew";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserType } from "@/app/components/context/userId_and_connection/provider";
import { useUnread } from "@/app/components/context/UnreadContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePresence } from "@/app/components/context/PresenceContext";
import { useHuddleCalls } from "@/hooks/useHuddleCalls";
import {
  incrementStoredMentionCount,
  clearStoredMentionCount,
  getStoredMentionCount,
  // Reuse the generic unread helpers with the special key "threads"
  getStoredUnread,
  incrementStoredUnread,
  clearStoredUnread,
} from "@/hooks/useLastRead";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getUserPreferencesUpdateEventName,
  isTargetMuted,
  readStoredUserPreferences,
  syncUserPreferencesFromApi,
  type NotificationPreferences,
} from "@/lib/user-preferences";

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
  
  const pathname = usePathname();
  const router = useRouter();

  // ─── Active huddle tracking (current user's huddle via URL) ─────────────
  const searchParams = useSearchParams();
  const activeHuddleChannelId = pathname === "/huddle" ? searchParams.get("channel_id") : null;

  // ─── Huddle invite toasts ────────────────────────────────────────────────
  type HuddleInvite = { id: string; channel_id: number; channel_name: string | null; meeting_id: string; started_by: number; isDm?: boolean };
  const [huddleInvites, setHuddleInvites] = React.useState<HuddleInvite[]>([]);

  const dismissInvite = React.useCallback((id: string) => {
    setHuddleInvites((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const { unreadCounts, seedFromStorage, incrementUnread, clearUnread } = useUnread();
  const { requestPermission, showNotification } = usePushNotifications();
  const { seedUsers, seedChannelHuddles } = usePresence();
  const [notificationPreferences, setNotificationPreferences] = React.useState<NotificationPreferences>(
    () => readStoredUserPreferences().notificationPreferences
  );
  const joinedPublicChannelIdsRef = React.useRef<Set<string>>(new Set());

  // ─── Mention counts (channelId → count) ─────────────────────────────────
  const [mentionCounts, setMentionCounts] = React.useState<Record<string, number>>({});
  const { ongoingCalls } = useHuddleCalls();

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

  React.useEffect(() => {
    setNotificationPreferences(readStoredUserPreferences().notificationPreferences);
  }, [user?.id]);

  const publicChannelIds = React.useMemo(
    () =>
      channels
        .filter((channel) => !channel.is_private && !channel.is_dm)
        .map((channel) => String(channel.id)),
    [channels]
  );

  const publicChannelIdSet = React.useMemo(
    () => new Set(publicChannelIds),
    [publicChannelIds]
  );

  const publicChannelNameById = React.useMemo(
    () =>
      Object.fromEntries(
        channels
          .filter((channel) => !channel.is_private && !channel.is_dm)
          .map((channel) => [String(channel.id), channel.title ?? `Channel ${channel.id}`])
      ) as Record<string, string>,
    [channels]
  );

  const markSocketEventSeen = React.useCallback((key: string) => {
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(key)) return true;
    window.sessionStorage.setItem(key, "1");
    return false;
  }, []);

  React.useEffect(() => {
    if (!user) return;

    let cancelled = false;

    api
      .get("/users/me")
      .then((res) => {
        if (cancelled) return;
        const syncedPreferences = syncUserPreferencesFromApi(res.data);
        setNotificationPreferences(syncedPreferences.notificationPreferences);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load user preferences:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!socket) return;

    const syncPublicChannelRooms = () => {
      const nextIds = new Set(publicChannelIds);

      joinedPublicChannelIdsRef.current.forEach((channelId) => {
        if (!nextIds.has(channelId)) {
          socket.emit("leaveChannel", { channel_id: Number(channelId) });
        }
      });

      nextIds.forEach((channelId) => {
        socket.emit("joinChannel", { channel_id: Number(channelId) });
      });

      joinedPublicChannelIdsRef.current = nextIds;
    };

    syncPublicChannelRooms();
    socket.on("connect", syncPublicChannelRooms);

    return () => {
      socket.off("connect", syncPublicChannelRooms);
    };
  }, [socket, publicChannelIds]);

  React.useEffect(() => {
    const handlePreferencesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ notificationPreferences?: NotificationPreferences }>).detail;
      setNotificationPreferences(
        detail?.notificationPreferences
          ? {
              ...DEFAULT_NOTIFICATION_PREFERENCES,
              ...detail.notificationPreferences,
            }
          : readStoredUserPreferences().notificationPreferences
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "userPreferences") return;
      setNotificationPreferences(readStoredUserPreferences().notificationPreferences);
    };

    window.addEventListener(getUserPreferencesUpdateEventName(), handlePreferencesUpdated as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(getUserPreferencesUpdateEventName(), handlePreferencesUpdated as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const shouldShowNotificationForTarget = React.useCallback(
    ({
      channelId,
      isDm = false,
      type = "message",
    }: {
      channelId?: string | number | null;
      isDm?: boolean;
      type?: "message" | "mention" | "thread" | "huddle";
    }) => {
      if (!notificationPreferences.desktop) return false;
      if (isTargetMuted(notificationPreferences, { channelId, isDm })) return false;
      if (isDm && !notificationPreferences.directMessages) return false;
      if (type === "mention" && !notificationPreferences.mentions) return false;
      if (type === "thread" && !notificationPreferences.threadReplies) return false;
      if (type === "huddle" && !notificationPreferences.huddles) return false;
      return true;
    },
    [notificationPreferences]
  );

  // ─── Request notification permission once after login ───────────────────
  React.useEffect(() => {
    if (!user) return;
    if (!notificationPreferences.desktop) return;
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const t = setTimeout(() => requestPermission(), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [user, requestPermission, notificationPreferences.desktop]);

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
      if (String(notification.sender_id) === String(user.id)) return;

      const channelId = String(notification.channel_id);
      if (currentChannelIdRef.current === channelId) return;
      if (markSocketEventSeen(`message-notif:${notification.message_id}`)) return;

      incrementUnread(channelId);

      const channelLabel = notification.is_dm
        ? notification.sender_name
        : `#${notification.channel_name ?? channelId}`;

      if (
        shouldShowNotificationForTarget({
          channelId,
          isDm: notification.is_dm,
          type: "message",
        })
      ) {
        showNotification({
          title: channelLabel,
          body: `${notification.is_dm ? "" : `${notification.sender_name}: `}${notification.preview || "New message"}`,
          icon: notification.avatar_url,
          channelId,
          force: true,
          playSound: notificationPreferences.sound,
        });
      }
    };

    const handlePublicChannelReceive = (message: {
      id: string | number;
      channel_id: string | number;
      sender_id: string | number;
      sender_name?: string;
      avatar_url?: string;
      content?: string;
    }) => {
      const channelId = String(message.channel_id);

      if (!publicChannelIdSet.has(channelId)) return;
      if (String(message.sender_id) === String(user.id)) return;
      if (currentChannelIdRef.current === channelId) return;
      if (markSocketEventSeen(`message-notif:${message.id}`)) return;

      incrementUnread(channelId);

      if (
        shouldShowNotificationForTarget({
          channelId,
          isDm: false,
          type: "message",
        })
      ) {
        showNotification({
          title: `#${publicChannelNameById[channelId] ?? channelId}`,
          body: `${message.sender_name ?? "Someone"}: ${(message.content ?? "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100) || "New message"}`,
          icon: message.avatar_url,
          channelId,
          force: true,
          playSound: notificationPreferences.sound,
        });
      }
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
      if (String(notification.sender_id) === String(user.id)) return;

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

      if (
        shouldShowNotificationForTarget({
          channelId,
          isDm: notification.is_dm,
          type: "thread",
        })
      ) {
        showNotification({
          title: `${notification.sender_name} replied in ${channelLabel}'s thread`,
          body: notification.preview || "New thread reply",
          icon: notification.avatar_url,
          channelId,
          force: true,
          playSound: notificationPreferences.sound,
        });
      }
    };

    socket.on("newMessageNotification", handleNotification);
    socket.on("receiveMessage", handlePublicChannelReceive);
    socket.on("newThreadNotification", handleThreadNotification);
    return () => {
      socket.off("newMessageNotification", handleNotification);
      socket.off("receiveMessage", handlePublicChannelReceive);
      socket.off("newThreadNotification", handleThreadNotification);
    };
  }, [
    socket,
    user,
    incrementUnread,
    publicChannelIdSet,
    publicChannelNameById,
    markSocketEventSeen,
    showNotification,
    shouldShowNotificationForTarget,
    notificationPreferences.sound,
  ]);

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

      if (
        shouldShowNotificationForTarget({
          channelId,
          isDm: notification.is_dm,
          type: "mention",
        })
      ) {
        showNotification({
          title: `${notification.sender_name} mentioned you in ${channelLabel}`,
          body: notification.preview || "You were mentioned",
          icon: notification.avatar_url,
          channelId,
          force: true,
          playSound: notificationPreferences.sound,
        });
      }
    };

    socket.on("newMentionNotification", handleMention);
    return () => { socket.off("newMentionNotification", handleMention); };
  }, [
    socket,
    user,
    incrementMention,
    incrementUnread,
    showNotification,
    shouldShowNotificationForTarget,
    notificationPreferences.sound,
  ]);

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
        seedChannelHuddles(
          ch.data
            .filter((c: any) => c.has_active_huddle)
            .map((c: any) => c.id)
        );

        const dm = await api.get(`/dm`);
        const userList = dm.data.map((d: any) => ({
          id: d.id,
          title: d.name,
          url: `/dm/${d.id}`,
          avatar_url: d.avatar_url ?? null,
          target_user_id: d.other_user_id ?? null,
          status: d.status ?? null,
          is_online: d.is_online ?? false,
          is_huddling: d.is_huddling ?? false,
          last_seen: d.last_seen ?? null,
          presence_hidden: d.presence_hidden ?? false,
        }));
        setUsers(userList);
        seedUsers(
          dm.data
            .map((d: any) => ({
              id: d.other_user_id ?? null,
              is_online: d.is_online,
              is_huddling: d.is_huddling,
              last_seen: d.last_seen,
              presence_hidden: d.presence_hidden ?? false,
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
            status: otherMember.status ?? null,
            is_online: otherMember.is_online ?? false,
            last_seen: otherMember.last_seen ?? null,
            presence_hidden: otherMember.presence_hidden ?? false,
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
        status: d.status ?? null,
        is_online: d.is_online ?? false,
        last_seen: d.last_seen ?? null,
        presence_hidden: d.presence_hidden ?? false,
      }));
      setUsers(userList);
      seedUsers(
        dm.data
          .map((d: any) => ({
            id: d.other_user_id ?? null,
            is_online: d.is_online,
            last_seen: d.last_seen,
            presence_hidden: d.presence_hidden ?? false,
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
          status: d.status ?? null,
          is_online: d.is_online ?? false,
          last_seen: d.last_seen ?? null,
          presence_hidden: d.presence_hidden ?? false,
        }));
        setUsers(userList);
        seedUsers(
          res.data
            .map((d: any) => ({
              id: d.other_user_id ?? null,
              is_online: d.is_online,
              last_seen: d.last_seen,
              presence_hidden: d.presence_hidden ?? false,
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

  // ─── Socket: huddle started / ended ─────────────────────────────────────
  React.useEffect(() => {
    if (!socket) return;

    const handleHuddleStarted = (data: any) => {
      const rawChannelId = data.channel_id ?? data.channelId;
      if (rawChannelId == null) return;

      const chId = String(rawChannelId);
      const starterId = data.started_by ?? data.startedBy ?? null;

      // Don't show invite to the person who started the huddle
      if (user && starterId != null && String(starterId) === String(user.id)) return;

      // Skip if this user is already on the huddle page
      if (typeof window !== "undefined" && window.location.pathname === "/huddle") return;

      // Only show the invite if the user is a member of that channel
      // (the backend already emits to channel_<id> room so server-side filtering is done)
      const isDm = channels.find((ch) => String(ch.id) === chId)?.is_dm ??
        users.find((u) => String(u.id) === chId) != null;
      if (
        !shouldShowNotificationForTarget({
          channelId: chId,
          isDm: !!isDm,
          type: "huddle",
        })
      ) {
        return;
      }

      setHuddleInvites((prev) => {
        // Avoid duplicate invites for same channel
        if (prev.some((inv) => String(inv.channel_id) === chId)) return prev;
        return [
          ...prev,
          {
            id: `${chId}-${Date.now()}`,
            channel_id: Number(chId),
            channel_name: data.channel_name ?? null,
            meeting_id: data.meeting_id ?? data.roomId,
            started_by: starterId != null ? Number(starterId) : 0,
            isDm: !!isDm,
            started_by_username: data.started_by_username ?? null,
          },
        ];
      });
    };

    const handleHuddleEnded = (data: any) => {
      const chId = String(data.channel_id);
      // Remove any pending invite for this channel
      setHuddleInvites((prev) => prev.filter((inv) => String(inv.channel_id) !== chId));
    };

    socket.on("huddleStarted", handleHuddleStarted);
    socket.on("huddleEnded", handleHuddleEnded);
    return () => {
      socket.off("huddleStarted", handleHuddleStarted);
      socket.off("huddleEnded", handleHuddleEnded);
    };
  }, [socket, channels, users, user, shouldShowNotificationForTarget]);

  const handleAddChannel = () => { setModalType("channel"); setModalOpen(true); };
  const handleAddDM = () => { setModalType("dm"); setModalOpen(true); };

  const handleInstantHuddle = async () => {
    try {
      // Manage the huddle ID ourselves using the backend API
      const res = await api.post(`/huddle/instant`);
      if (res.data?.room_id) {
        router.push(`/huddle?meeting_id=${res.data.room_id}`);
      }
    } catch (err) {
      console.error("Failed to start instant huddle:", err);
    }
  };

  const { isHuddling } = usePresence();

  const navMain = [
    {
      title: "Channels",
      url: "#",
      type: "channel",
      icon: HiHashtag,
      isActive: true,
      items: channels.map((ch) => {
        const channelHuddle = ongoingCalls.find((call) => String(call.channelId) === String(ch.id));
        return {
          ...ch,
          unread: unreadCounts[String(ch.id)] ?? 0,
          mentions: mentionCounts[String(ch.id)] ?? 0,
          hasActiveHuddle: !!channelHuddle,
        };
      }),
      onAdd: handleAddChannel,
    },
    {
      title: "Direct Messages",
      url: "#",
      type: "dm",
      icon: IoChatbubblesOutline,
      isActive: true,
      items: users.map((u) => {
        const otherUserId = u.target_user_id ? String(u.target_user_id) : null;
        // Show headphone icon if the user is in ANY huddle across the workspace (via presence)
        const userInAnyHuddle = isHuddling(otherUserId);
        return {
          ...u,
          unread: unreadCounts[String(u.id)] ?? 0,
          mentions: mentionCounts[String(u.id)] ?? 0,
          hasActiveHuddle: userInAnyHuddle,
        };
      }),
      onAdd: handleAddDM,
    },
  ];

  const projects = [
    { name: "Threads", url: "/threads", icon: Frame, unread: threadUnreadCount },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
               <SidebarMenuButton
                 onClick={handleInstantHuddle}
                 className="cursor-pointer border border-slate-200 bg-white font-medium text-slate-900 shadow-sm dark:border-slate-200 dark:bg-white dark:text-slate-900"
               >
                 <PhoneCall className="h-4 w-4 shrink-0" />
                 <span>Instant Huddle</span>
               </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
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
      <HuddleInviteToast invites={huddleInvites} onDecline={dismissInvite} />
    </Sidebar>
  );
}
