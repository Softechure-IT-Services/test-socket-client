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
  Settings2,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
 const [channels, setChannels] = React.useState([]);
const [users, setUsers] = React.useState([]);

React.useEffect(() => {
  const fetchData = async () => {
    try {
      // Fetch channels
      const ch = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/channels`);
      const mappedCh = ch.data.map((ch: any) => ({
        title: ch.name,
        url: `/channels/${ch.id}`,
      }));
      setChannels(mappedCh);

      // Fetch users
      const us = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/users`);
      const mappedUsers = us.data.map((u: any) => ({
        title: u.name,
        url: `/dm/${u.id}`, // change to your DM page route
        avatar: u.avatar_url,
        is_online: u.is_online,
      }));
      setUsers(mappedUsers);

    } catch (err) {
      console.error("Sidebar fetch error:", err);
    }
  };

  fetchData();
}, []);


  // ----- STATIC DATA (kept same as your previous structure) -----
  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      { name: "Acme Inc", logo: GalleryVerticalEnd, plan: "Enterprise" },
      { name: "Acme Corp.", logo: AudioWaveform, plan: "Startup" },
      { name: "Evil Corp.", logo: Command, plan: "Free" },
    ],
    navMain: [
      {
        title: "Channels",
        url: "#",
        icon: SquareTerminal,
        isActive: true,
        items: channels, // 🔥 dynamic channels injected here
      },
      {
        title: "Direct Messages",
        url: "#",
        icon: Bot,
        items: users,
      },
      {
        title: "Apps & Docs",
        url: "#",
        icon: BookOpen,
        items: [
          { title: "Introduction", url: "#" },
          { title: "Get Started", url: "#" },
          { title: "Tutorials", url: "#" },
          { title: "Changelog", url: "#" },
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

        {/* Now dynamic */}
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
