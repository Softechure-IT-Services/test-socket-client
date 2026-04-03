"use client"

import React from "react"
import { ChevronRight, Plus, Hash, Lock, Headphones } from "lucide-react"
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
import { UserAvatar } from "@/app/components/MessageMeta"
import { usePresence } from "@/app/components/context/PresenceContext"
import { formatRelativeTime } from "@/lib/utils"

type SubItem = {
  title: string
  url: string
  is_private?: boolean
  is_dm?: boolean
  avatar_url?: string
  target_user_id?: string | number | null
  status?: string | null
  last_seen?: string | null
  is_online?: boolean
  presence_hidden?: boolean
  unread?: number
  /** Number of times the current user was @mentioned in this channel */
  mentions?: number
  /** Whether there is an active huddle in this channel/DM */
  hasActiveHuddle?: boolean
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

function DMAvatar({ sub, online, hidden = false }: { sub: SubItem; online: boolean; hidden?: boolean }) {
  const avatarUrl = sub.avatar_url ?? (sub as any)?.avatar ?? null
  return (
    <div className="relative">
      <UserAvatar
        name={sub.title ?? ""}
        avatarUrl={avatarUrl ?? null}
        size="xs"
        rounded="full"
        className="shrink-0"
      />
      {!hidden && (
        <span
          aria-label={online ? "Online" : "Offline"}
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background ${
            online ? "bg-emerald-500" : "bg-gray-500"
          }`}
        />
      )}
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
  const presence = usePresence()

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
                        const targetId =
                          sub.target_user_id ??
                          (sub as any)?.other_user_id ??
                          (sub as any)?.user_id ??
                          null
                        const presenceHidden = targetId
                          ? presence.isHidden(targetId)
                          : sub.presence_hidden ?? false
                        const online = targetId
                          ? presence.isOnline(targetId)
                          : sub.is_online ?? false
                        const lastSeen =
                          (targetId ? presence.getLastSeen(targetId) : null) ??
                          sub.last_seen ??
                          null
                        const relativeLastSeen = lastSeen ? formatRelativeTime(lastSeen) : null
                        const customStatus =
                          typeof sub.status === "string" && sub.status.trim()
                            ? sub.status.trim()
                            : null
                        // const statusLabel = customStatus
                        //   ? customStatus
                        //   : online
                        //   ? "Online"
                        //   : relativeLastSeen
                        //   ? `Last seen ${relativeLastSeen}`
                        //   : "Offline"

                          const statusLabel = presenceHidden
                          ? "Status hidden"
                          : online
                          ? ""
                          : relativeLastSeen
                          ? `Last seen ${relativeLastSeen}`
                          : "Offline"

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
                                  <DMAvatar sub={sub} online={online} hidden={presenceHidden} />
                                ) : (
                                  sub.is_dm === false && <ChannelIcon sub={sub} />
                                )}
                                <span className="flex flex-row items-center min-w-0 gap-1">
                                  <span
                                    className={
                                      hasActivity ? "truncate font-semibold" : "truncate"
                                    }
                                  >
                                    {sub.title}
                                  </span>
                                  {sub.hasActiveHuddle && (
                                    <Headphones className="h-3 w-3 shrink-0 text-indigo-400 animate-pulse" aria-label="Active huddle" />
                                  )}
                                  {item.type === "dm" && (
                                    <span className="text-[11px] ps-1 truncate">
                                      {statusLabel}
                                    </span>
                                  )}
                                </span>
                                {customStatus &&(<span className="text-[12px]/[14px] font-bold">
                                  "{customStatus}"
                                </span>)}
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
                const targetId =
                  sub.target_user_id ??
                  (sub as any)?.other_user_id ??
                  (sub as any)?.user_id ??
                  null
                const presenceHidden = targetId
                  ? presence.isHidden(targetId)
                  : sub.presence_hidden ?? false
                const online = targetId
                  ? presence.isOnline(targetId)
                  : sub.is_online ?? false

                return (
                  <SidebarMenuItem key={sub.url} className="relative">
                    <SidebarMenuButton asChild tooltip={sub.title} isActive={isActive}>
                      <Link href={sub.url} className="flex items-center justify-center">
                        {item.type === "dm" ? (
                          <DMAvatar sub={sub} online={online} hidden={presenceHidden} />
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
