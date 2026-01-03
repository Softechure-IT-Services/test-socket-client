"use client";

import * as React from "react";
import axios from "axios";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import CreateModal from "@/components/modals/CreateNew";
import { useAuth } from "@/components/context/userId_and_connection/provider";
// const API_URL = process.env.NEXT_PUBLIC_SERVER_URL;
import { UserType } from "@/components/context/userId_and_connection/provider";
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");


  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Channels
        const ch = await axios.get(
          `/api/channels`,
          {
            withCredentials: true,
          }
        );
        setChannels(
          ch.data.map((c: any) => ({
            title: c.name,
            url: `/channel/${c.id}`,
            is_private: c.is_private,
            is_dm: c.is_dm,
          }))
        );

        // ✅ Users
        const us = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/users`,
          {
            withCredentials: true,
          }
        );

        setUsers(
          us.data.map((u: any) => ({
            title: u.name,
            url: `/dm/${u.id}`,
            avatar: u.avatar_url,
            is_online: u.is_online,
          }))
        );
      } catch (err) {
        console.error("Sidebar fetch error:", err);
      }
    };

    fetchData();
  }, []);


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
        icon: SquareTerminal,
        isActive: true,
        items: channels,
         onAdd: handleAddChannel,
      },
      {
        title: "Direct Messages",
        url: "#",
        type: "dm",
        icon: Bot,
        items: users,
        onAdd: handleAddDM,
      },
      {
        title: "Apps & Docs",
        url: "#",
        icon: BookOpen,
        items: [
          { title: "Introduction", url: "#" },
          { title: "Get Started", url: "#" },
        ],
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
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

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
