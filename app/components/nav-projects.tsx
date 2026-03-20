"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type LucideIcon } from "lucide-react"
import { useSidebar } from "@/app/components/ui/sidebar"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/app/components/ui/sidebar"

type ProjectItem = {
  name: string
  url: string
  icon: LucideIcon
  /** Unread count for this nav item (e.g. unseen thread replies) */
  unread?: number
}

// ─── Unread badge (matches the style from nav-main) ───────────────────────────

function UnreadBadge({
  count,
  collapsed = false,
}: {
  count: number
  collapsed?: boolean
}) {
  if (count <= 0) return null

  if (collapsed) {
    return (
      <span
        aria-label={`${count} unread`}
        className="
          pointer-events-none absolute -top-0.5 -right-0.5
          min-w-[16px] h-4 rounded-full
          bg-sidebar-primary text-sidebar-primary-foreground
          text-[9px] font-bold
          flex items-center justify-center px-1 leading-none
          ring-2 ring-sidebar
          z-10
        "
      >
        {count > 9 ? "9+" : count}
      </span>
    )
  }

  return (
    <span
      aria-label={`${count} unread`}
      className="
        pointer-events-none absolute right-2 top-1/2 -translate-y-1/2
        min-w-[18px] h-[18px] rounded-full
        bg-sidebar-primary text-sidebar-primary-foreground
        text-[10px] font-bold
        flex items-center justify-center px-1 leading-none
        z-10
      "
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NavProjects({ projects }: { projects: ProjectItem[] }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
          const unread = item.unread ?? 0

          return (
            <SidebarMenuItem key={item.name} className="relative">
              <SidebarMenuButton asChild tooltip={item.name} isActive={isActive}>
                <Link href={item.url} className={unread > 0 && !isCollapsed ? "pr-8" : ""}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>

              <UnreadBadge count={unread} collapsed={isCollapsed} />
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}