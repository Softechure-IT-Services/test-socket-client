"use client"

import React from "react"
import { ChevronRight, Plus, Hash, Lock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/app/components/ui/sidebar"

type SubItem = {
  title: string
  url: string
  is_private?: boolean
  is_dm?: boolean
  avatar_url?: string
  unread?: number
  /** Number of times the current user was @mentioned in this channel */
  mentions?: number
}

type NavItem = {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  type?: string
  isActive?: boolean
  onAdd?: () => void
  items?: SubItem[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function DMAvatar({ sub }: { sub: SubItem }) {
  if (sub.avatar_url) {
    return (
      <img
        src={sub.avatar_url}
        alt={sub.title ?? ""}
        className="h-5 w-5 rounded-full object-cover shrink-0"
      />
    )
  }
  const initials =
    (sub.title ?? "")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "?"
  return (
    <div className="h-5 w-5 rounded-sm bg-muted flex items-center justify-center text-black text-[10px] font-medium shrink-0">
      {initials}
    </div>
  )
}

function ChannelIcon({ sub }: { sub: SubItem }) {
  if (sub.is_private) return <Lock className="h-3 w-3 shrink-0 text-inherit" />
  return <Hash className="h-3 w-3 shrink-0 text-inherit" />
}

/**
 * Slack-style unread badge.
 * Expanded sidebar → right-aligned pill with count.
 * Collapsed sidebar → tiny dot/count in corner.
 */
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

/**
 * @ mention badge — shown in addition to (or instead of) the unread pill.
 *
 * Expanded sidebar  → amber pill with "@N" to the left of the unread badge.
 * Collapsed sidebar → amber dot in the top-left corner.
 */
function MentionBadge({
  count,
  hasUnread,
  collapsed = false,
}: {
  count: number
  hasUnread: boolean
  collapsed?: boolean
}) {
  if (count <= 0) return null

  if (collapsed) {
    // Top-left corner so it doesn't clash with the unread badge (top-right)
    return (
      <span
        aria-label={`${count} mention${count === 1 ? "" : "s"}`}
        className="
          pointer-events-none absolute -top-0.5 -left-0.5
          min-w-[16px] h-4 rounded-full
          bg-amber-500 text-white
          text-[9px] font-bold
          flex items-center justify-center px-1 leading-none
          ring-2 ring-sidebar
          z-10
        "
      >
        @
      </span>
    )
  }

  // In expanded mode shift left further when the unread badge is also present
  const rightClass = hasUnread ? "right-[2rem]" : "right-2"

  return (
    <span
      aria-label={`${count} mention${count === 1 ? "" : "s"}`}
      className={`
        pointer-events-none absolute ${rightClass} top-1/2 -translate-y-1/2
        min-w-[18px] h-[18px] rounded-full
        bg-amber-500 text-white
        text-[10px] font-bold
        flex items-center justify-center leading-normal
        z-10
      `}
    >
      {count && `@`}
    </span>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NavMain({ items }: { items: NavItem[] }) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()

  return (
    <>
      {items.map((item) => (
        <SidebarGroup key={item.title}>

          {/* ── Expanded sidebar ─────────────────────────────────── */}
          {!isCollapsed && (
            <>
              <SidebarMenu>
                <Collapsible defaultOpen={item.isActive} className="group/collapsible">
                  <div className="relative flex items-center border-b border-[var(--border-color)]">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuItem>
                        <SidebarMenuButton className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          <SidebarGroupLabel asChild>
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.icon && <item.icon className="h-3.5 w-3.5" />}
                              <span>{item.title}</span>
                            </span>
                          </SidebarGroupLabel>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </CollapsibleTrigger>

                    {item.onAdd && (
                      <SidebarGroupAction
                        onClick={item.onAdd}
                        aria-label={`Add ${item.title}`}
                        className="ml-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add {item.title}</span>
                      </SidebarGroupAction>
                    )}
                  </div>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((sub) => {
                        const isActive =
                          pathname === sub.url || pathname.startsWith(sub.url + "/")
                        const unread = sub.unread ?? 0
                        const mentions = sub.mentions ?? 0
                        const hasUnread = unread > 0
                        const hasMention = mentions > 0
                        const hasActivity = hasUnread || hasMention

                        return (
                          <SidebarMenuSubItem key={sub.url} className="relative">
                            {/*
                              Left accent bar: amber for mentions, blue for
                              plain unread — only when not on the active channel.
                            */}
                            {hasActivity && !isActive && (
                              <span
                                aria-hidden
                                className={`
                                  absolute left-0 top-1/2 -translate-y-1/2
                                  w-[3px] h-[60%] rounded-r-full
                                  transition-all duration-150
                                  ${hasMention ? "bg-amber-500" : "bg-sidebar-primary"}
                                `}
                              />
                            )}

                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                              className={
                                hasActivity && !isActive ? "bg-accent" : ""
                              }
                            >
                              {/*
                                pr-16 leaves room for both badges side-by-side.
                                Drop back to pr-8 when only one badge is shown.
                              */}
                              <Link
                                href={sub.url}
                                className={`flex items-center gap-2 ${
                                  hasUnread && hasMention ? "pr-16" : "pr-8"
                                }`}
                              >
                                {item.type === "dm" ? (
                                  <DMAvatar sub={sub} />
                                ) : (
                                  sub.is_dm === false && <ChannelIcon sub={sub} />
                                )}
                                <span
                                  className={
                                    hasActivity ? "truncate font-semibold" : "truncate"
                                  }
                                >
                                  {sub.title}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>

                            {/* Mention badge sits to the left of the unread pill */}
                            <MentionBadge
                              count={mentions}
                              hasUnread={hasUnread}
                            />
                            <UnreadBadge count={unread} />
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenu>
            </>
          )}

          {/* ── Collapsed sidebar (icon-only) ────────────────────── */}
          {isCollapsed && (
            <SidebarMenu>
              {item.items?.map((sub) => {
                const isActive =
                  pathname === sub.url || pathname.startsWith(sub.url + "/")
                const unread = sub.unread ?? 0
                const mentions = sub.mentions ?? 0
                const hasUnread = unread > 0
                const hasMention = mentions > 0

                return (
                  <SidebarMenuItem key={sub.url} className="relative">
                    <SidebarMenuButton asChild tooltip={sub.title} isActive={isActive}>
                      <Link href={sub.url} className="flex items-center justify-center">
                        {item.type === "dm" ? (
                          <DMAvatar sub={sub} />
                        ) : sub.is_private ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                        <span className="sr-only">{sub.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    {/* Top-right: unread count; top-left: @ mention dot */}
                    {hasUnread && <UnreadBadge count={unread} collapsed />}
                    {hasMention && (
                      <MentionBadge count={mentions} hasUnread={hasUnread} collapsed />
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          )}

        </SidebarGroup>
      ))}
    </>
  )
}