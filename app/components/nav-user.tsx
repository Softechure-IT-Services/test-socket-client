"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { UserType } from "@/app/components/context/userId_and_connection/provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/app/components/ui/sidebar";

function Avatar({ user }: { user: UserType }) {
  const initials = user.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <span className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-bold flex items-center justify-center shrink-0 select-none">
      {initials}
    </span>
  );
}

export function NavUser({ user }: { user: UserType }) {
  const { isMobile } = useSidebar();
  const { logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar user={user} />
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            {/* User info header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <Avatar user={user} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{user.name}</span>
                <span className="text-xs truncate">
                  {user.email}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Profile & Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}