"use client";

import * as React from "react";
import api from "@/lib/axios";
import {
  Frame,
  GalleryVerticalEnd,
  AudioWaveform,
  Command,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const { user, socket } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");

  // Unread counts come from shared context — ChannelChat increments them via socket
  const { unreadCounts, seedFromStorage, incrementUnread, clearUnread } = useUnread();

  const pathname = usePathname();
  const router = useRouter();

  const currentChannelId = React.useMemo(() => {
    const match = pathname?.match(/^\/channel\/(\d+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Always-fresh ref so the socket handler doesn't capture a stale closure
  const currentChannelIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
    // Clear unread for the channel we just navigated into
    if (currentChannelId) clearUnread(currentChannelId);
  }, [currentChannelId]);

  // ─── Re-join ALL channel rooms whenever navigation happens ───────────────────
  // ChannelChat emits "leaveChannel" for the old channel on navigation, which
  // removes the socket from that server-side room. We re-join all rooms here so
  // the sidebar can keep receiving receiveMessage events for every channel.
  const allChannelIdsRef = React.useRef<number[]>([]);
  React.useEffect(() => {
    allChannelIdsRef.current = [
      ...channels.map((ch) => Number(ch.id)),
      ...users.map((u) => {
        const match = u.url?.match(/\/channel\/(\d+)/);
        return match ? Number(match[1]) : null;
      }).filter(Boolean) as number[],
    ];
  }, [channels, users]);

  React.useEffect(() => {
    if (!socket) return;
    // Re-join all rooms after every channel navigation (ChannelChat left the old one)
    const timeout = setTimeout(() => {
      allChannelIdsRef.current.forEach((id) => {
        socket.emit("joinChannel", { channel_id: id });
      });
    }, 100); // small delay so ChannelChat's leaveChannel fires first
    return () => clearTimeout(timeout);
  }, [socket, currentChannelId]); // re-run on every channel change

  // ─── Global receiveMessage → increment unread for background channels ─────────
  React.useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: any) => {
      const msgChannelId = String(msg.channel_id);
      // Skip own messages
      if (String(msg.sender_id) === String(user.id)) return;
      // Skip the channel the user is currently viewing
      if (currentChannelIdRef.current === msgChannelId) return;
      // Increment via context (also persists to localStorage)
      incrementUnread(msgChannelId);
    };

    socket.on("receiveMessage", handleNewMessage);
    return () => { socket.off("receiveMessage", handleNewMessage); };
  }, [socket, user]); // no currentChannelId dep — use ref instead

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
  }, []);

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

    const handleAddedToChannel = (data: { channelId: number; channel?: any; channelName?: string }) => {
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
    { name: "Drafts", url: "/drafts", icon: Map },
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