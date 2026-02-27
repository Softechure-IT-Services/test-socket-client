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
}

type NavItem = {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  type?: string
  isActive?: boolean
  onAdd?: () => void
  items?: SubItem[]
}

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
  const initials = (sub.title ?? "")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "?"
  return (
    <div className="h-5 w-5 rounded-sm bg-muted flex items-center justify-center text-black text-[10px] font-medium shrink-0">
      {initials}
    </div>
  )
}

function ChannelIcon({ sub }: { sub: SubItem }) {
  if (sub.is_private) {
    return <Lock className="h-3 w-3 shrink-0 text-inherit" />
  }
  return <Hash className="h-3 w-3 shrink-0 text-inherit" />
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()

  return (
    <>
      {items.map((item) => (
        <SidebarGroup key={item.title}>
          {/* When sidebar is expanded: show full collapsible group */}
          {!isCollapsed && (
            <>
              <div className="relative flex items-center border-b border-[var(--border-color)]">
                <SidebarGroupLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.icon && <item.icon className="h-3.5 w-3.5" />}
                  <span>{item.title}</span>
                </SidebarGroupLabel>
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

              <SidebarMenu>
                <Collapsible defaultOpen={item.isActive} className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        <span className="text-xs">{item.items?.length ?? 0} items</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((sub) => {
                        const isActive = pathname === sub.url || pathname.startsWith(sub.url + "/") 
                        return (
                          <SidebarMenuSubItem key={sub.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                            >
                              <Link
                                href={sub.url}
                                className="flex items-center gap-2"
                              >
                                {item.type === "dm" ? (
                                  <DMAvatar sub={sub} />
                                ) : (
                                  sub.is_dm === false && <ChannelIcon sub={sub} />
                                )}
                                <span className={`truncate ${(sub.unread ?? 0) > 0 ? "font-semibold text-foreground" : ""}`}>
                                  {sub.title}
                                </span>
                                {(sub.unread ?? 0) > 0 && (
                                  <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                                    {sub.unread! > 99 ? "99+" : sub.unread}
                                  </span>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenu>
            </>
          )}

          {/* When sidebar is collapsed: show icon-only buttons for each item */}
          {isCollapsed && (
            <SidebarMenu>
              {item.items?.map((sub) => {
                const isActive = pathname === sub.url || pathname.startsWith(sub.url + "/") 
                return (
                  <SidebarMenuItem key={sub.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={sub.title}
                      isActive={isActive}
                    >
                      <Link href={sub.url} className="flex items-center justify-center relative">
                        {item.type === "dm" ? (
                          <DMAvatar sub={sub} />
                        ) : sub.is_private ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                        {(sub.unread ?? 0) > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                            {sub.unread! > 9 ? "9+" : sub.unread}
                          </span>
                        )}
                        <span className="sr-only">{sub.title}</span>
                      </Link>
                    </SidebarMenuButton>
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