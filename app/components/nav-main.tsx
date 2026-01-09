"use client"

import { ChevronRight,Plus, type LucideIcon } from "lucide-react"

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
} from "@/app/components/ui/sidebar"

import { FaLock } from "react-icons/fa";
import { FaHashtag } from "react-icons/fa";
import Link from "next/link"

type NavItem = {
  title: string
  icon?: LucideIcon
  type?: string
  isActive?: boolean
  onAdd?: () => void
  items?: {
    title: string
    url: string
    is_private?: Boolean
    is_dm?: Boolean
    avatar_url?: string
  }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <SidebarGroup key={item.title}>
          {/* 🔹 Group Header */}
          <div className="relative">
            <SidebarGroupLabel>
              <div className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.title}</span>
              </div>
            </SidebarGroupLabel>

            {item.onAdd && (
              <SidebarGroupAction
                onClick={item.onAdd}
                aria-label={`Add ${item.title}`}
                tooltip={`Add ${item.title}`}
              >
                <Plus />
              </SidebarGroupAction>
            )}
          </div>

          {/* 🔹 Collapsible menu */}
          <SidebarMenu>
            <Collapsible defaultOpen={item.isActive}>
              <CollapsibleTrigger asChild>
                <SidebarMenuItem className="custom_drop_trigger">
                  <SidebarMenuButton>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((sub) => (
                    <SidebarMenuSubItem key={sub.title} >
                      { sub.is_dm == false ? (
                         sub.is_private == true ? (
                         <FaLock className="h-2.5 w-2.5 channel_privacy_icon" />
                         ) : (
                         <FaHashtag className="h-2.5 w-2.5 channel_privacy_icon" />
                         )
                      ) : 
                      null
                      }
                      <SidebarMenuSubButton asChild>
                        <Link href={sub.url}>{sub.title}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}