"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/app/components/ui/sidebar";

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/app/components/ui/sidebar"

import { Settings, Bell, Info, User } from "lucide-react";

export function RightSidebar() {
  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l bg-background"
    >
      <SidebarHeader>
        {/* <div className="font-semibold text-sm px-2">Utilities</div> */}
      </SidebarHeader>

      <SidebarContent>
         <Collapsible
            defaultOpen={false}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={"Utilities"}>
                  <Settings />
                  <span>Utilities</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <div className=" py-2 text-xs text-muted-foreground">v1.0.0</div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
