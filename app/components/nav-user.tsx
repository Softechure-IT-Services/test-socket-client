"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { usePresence } from "@/app/components/context/PresenceContext";
import { FaHeadphones } from "react-icons/fa6";
import { UserType } from "@/app/components/context/userId_and_connection/provider";
import { UserAvatar } from "@/app/components/MessageMeta";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

export function NavUser({ user }: { user: UserType }) {
  const { isMobile, open: isSidebarOpen } = useSidebar();
  const { logout } = useAuth();
  const router = useRouter();
  const { isHuddling } = usePresence();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const huddleActive = mounted && isHuddling(user.id);
  const statusTooltip = user.status?.trim();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const trigger = (
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatar_url}
          size="sm"
          rounded="full"
          className="shrink-0"
        />
        <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-semibold">{user.username}</span>
            {huddleActive && (
              <FaHeadphones className="size-3 text-indigo-400 animate-pulse shrink-0" />
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {statusTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
              <TooltipContent
                side={isMobile ? "bottom" : "right"}
                align="center"
                sideOffset={8}
              >
                {statusTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            trigger
          )}

          <DropdownMenuContent
            className="w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
          >
            {/* User info header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatar_url}
                size="sm"
                rounded="full"
                className="shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold truncate">{user.username}</span>
                  {huddleActive && (
                    <FaHeadphones className="size-3 text-indigo-400 animate-pulse shrink-0" />
                  )}
                </div>
                <span className="text-xs truncate">
                  {user.email}
                </span>
                {statusTooltip && (
                  <span className="text-xs text-muted-foreground truncate">
                    {statusTooltip}
                  </span>
                )}
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
