"use client";

import * as React from "react";
import api from "@/lib/axios";
import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
} from "lucide-react";
import { HiHashtag } from "react-icons/hi";
import { IoChatbubblesOutline } from "react-icons/io5";

import { NavMain } from "@/app/components/nav-main";
import { NavProjects } from "@/app/components/nav-projects";
import { NavUser } from "@/app/components/nav-user";
import { TeamSwitcher } from "@/app/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/app/components/ui/sidebar";
import CreateModal from "@/app/components/modals/CreateNew";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
// const API_URL = process.env.NEXT_PUBLIC_SERVER_URL;
import { UserType } from "@/app/components/context/userId_and_connection/provider";
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const { user, socket } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");

  React.useEffect(() => {
    // if (!user) return;
    const fetchData = async () => {
      try {
        // ✅ Channels
        const ch = await api.get(`/channels?get_dms=false`);
        setChannels(
          ch.data.map((c: any) => ({
            title: c.name,
            url: `/channel/${c.id}`,
            is_private: c.is_private,
            is_dm: c.is_dm,
          })),
        );

        // ✅ Users
        const dm = await api.get(`/dm`);

        setUsers(
          dm.data.map((d: any) => ({
            title: d.name,
            url: `/channel/${d.id}`, // ✅ THIS IS CHANNEL ID
            avatar: d.avatar_url,
          })),
        );
      } catch (err) {
        console.error("Sidebar fetch error:", err);
      }
    };

    fetchData();
  }, []);

  React.useEffect(() => {
    if (!socket) return;

    const handler = (channel: any) => {
      setChannels((prev) => [
        {
          title: channel.name,
          url: `/channel/${channel.id}`,
          is_private: channel.isPrivate ?? channel.is_private,
          is_dm: false,
        },
        ...prev,
      ]);
    };

    socket.on("channelCreated", handler);

    return () => {
      socket.off("channelCreated", handler);
    };
  }, [socket]);

  React.useEffect(() => {
  if (!socket || !user) return;

// const dmHandler = (payload: any) => {
//   setUsers(prev => {
//     const exists = prev.some(u => u.url === `/channel/${payload.channel_id}`);
//     if (exists) return prev;

//     const otherUser = payload.members.find((m: any) => m.id !== user?.id);

//     return [{
//       title: otherUser.name,
//       url: `/channel/${payload.channel_id}`,
//       avatar: otherUser.avatar_url,
//     }, ...prev];
//   });
// };
const dmHandler = async () => {
  const dm = await api.get(`/dm`);

  setUsers(
    dm.data.map((d: any) => ({
      title: d.name,
      url: `/channel/${d.id}`,
      avatar: d.avatar_url,
    }))
  );
};


  socket.on("dmCreated", dmHandler);

  return () => {
    socket.off("dmCreated", dmHandler);
  };
}, [socket, user]);


  const handleAddChannel = () => {
    setModalType("channel");
    setModalOpen(true);
  };

  const handleAddDM = () => {
    setModalType("dm");
    setModalOpen(true);
  };

  const data = {
    user: user,
    teams: [
      { name: "Acme Inc", logo: GalleryVerticalEnd, plan: "Enterprise" },
      { name: "Acme Corp.", logo: AudioWaveform, plan: "Startup" },
      { name: "Evil Corp.", logo: Command, plan: "Free" },
    ],
    navMain: [
      {
        title: "Channels",
        url: "#",
        type: "channel",
        icon: HiHashtag,
        isActive: true,
        items: channels,
        onAdd: handleAddChannel,
      },
      {
        title: "Direct Messages",
        url: "#",
        type: "dm",
        icon: IoChatbubblesOutline,
        items: users,
        isActive: true,
        onAdd: handleAddDM,
      },
    ],
    projects: [
      { name: "Threads", url: "#", icon: Frame },
      { name: "Calls", url: "#", icon: PieChart },
      { name: "Drafts", url: "#", icon: Map },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader> */}

      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>
        {user && <NavUser user={data.user as UserType} />}
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