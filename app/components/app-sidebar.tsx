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
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
const [modalType, setModalType] = React.useState<"channel" | "dm">("channel");


  React.useEffect(() => {
    // if (!user) return;
    const fetchData = async () => {
      try {
        // ✅ Channels
        const ch = await axios.get(
          `/api/channels?get_dms=false`,
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
        const dm = await axios.get(`/api/dm`, { withCredentials: true });

setUsers(
  dm.data.map((d: any) => ({
    title: d.name,
    url: `/dm/${d.id}`,   // ✅ THIS IS CHANNEL ID
    avatar: d.avatar_url,
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
        isActive: true,
        onAdd: handleAddDM,
      },
      {
        title: "Apps & Docs",
        url: "#",
        type: "docs",
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
