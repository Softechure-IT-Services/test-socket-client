"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Clock3, PhoneCall, Radio } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/app/components/ui/sidebar";
import { type HuddleCallListItem } from "@/hooks/useHuddleCalls";
import { formatRelativeTime } from "@/lib/utils";

export function NavCalls({
  ongoingCalls,
  recentCalls,
}: {
  ongoingCalls: HuddleCallListItem[];
  recentCalls: HuddleCallListItem[];
}) {
  const pathname = usePathname();
  const { state } = useSidebar();

  if (state === "collapsed") return null;

  const visibleOngoing = ongoingCalls;
  const visibleRecent = recentCalls;

  return (
    <SidebarGroup>
      <div className="mb-2 flex items-center justify-between px-2">
        <SidebarGroupLabel className="px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Calls
        </SidebarGroupLabel>
        <Link
          href="/calls"
          className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          View all
        </Link>
      </div>

      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname === "/calls"}>
            <Link href="/calls">
              <PhoneCall className="h-4 w-4" />
              <span>All calls</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      {visibleOngoing.length > 0 && (
        <>
          <p className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
            Ongoing
          </p>
          <SidebarMenu>
            {visibleOngoing.map((call) => (
              <SidebarMenuItem key={`sidebar-live-${call.roomId}`}>
                <SidebarMenuButton asChild>
                  <Link href={call.href} className="pr-8">
                    <Radio className="h-4 w-4 text-emerald-500" />
                    <span className="truncate">{call.title}</span>
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </>
      )}

      {visibleRecent.length > 0 && (
        <>
          <p className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Previous
          </p>
          <SidebarMenu>
            {visibleRecent.map((call) => {
              const relative =
                formatRelativeTime(call.lastLeftAt ?? call.lastJoinedAt) ?? "Recently";

              return (
                <SidebarMenuItem key={`sidebar-recent-${call.roomId}`}>
                  <SidebarMenuButton asChild>
                    <Link href={call.href} className="flex-col items-start gap-0.5 py-2">
                      <span className="flex w-full items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{call.title}</span>
                      </span>
                      <span className="pl-5 text-[11px] text-muted-foreground">
                        {call.lastLeftAt ? `Ended ${relative}` : `Joined ${relative}`}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </>
      )}
    </SidebarGroup>
  );
}
