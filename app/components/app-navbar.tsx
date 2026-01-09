"use client";

import React from "react";
import { FiMenu } from "react-icons/fi";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useSidebar } from "@/app/components/ui/sidebar";
import {
  Forward,
  Settings,
} from "lucide-react";

export default function AppNavbar() {
  const { isMobile } = useSidebar();

  return (
    <header className="w-full fixed top-0 z-[99] bg-background text-foreground border-b border-border">
      <div className="mx-auto max-w-8xl px-3 sm:px-6">
        <div className="flex items-center h-12 sm:h-14 justify-between">
          {/* LEFT SECTION — Menu + Navigation Arrows + Search */}
          <div className="hidden sm:grid grid-cols-12 items-center gap-3 flex-1 justify-start">
            <div className="flex items-center gap-3 flex-1 justify-start col-span-4">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-md hover:bg-accent flex items-center gap-1">
                  <FiMenu size={20} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-0 rounded-md hover:bg-accent flex items-center gap-1">
                        Profile
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-48 rounded-lg"
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                    >
                      <DropdownMenuItem>Profile</DropdownMenuItem>

                      <DropdownMenuItem>
                        <Forward className="text-muted-foreground" />
                        Share Project
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem>
                        <Settings size={18} />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DropdownMenuItem>

                {/* <DropdownMenuItem> */}
<DropdownMenu>
                    <DropdownMenuTrigger asChild>
                <DropdownMenuItem>
                      <button className="p-0 rounded-md hover:bg-accent flex items-center gap-1">
                        Help 
                      </button>
                </DropdownMenuItem>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-48 rounded-lg"
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                    >
                      <DropdownMenuItem>
                        Check for updates
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Clear Cache and Restart
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Open Help Center
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                {/* </DropdownMenuItem> */}
                <DropdownMenuItem>Log out</DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Back / Forward */}
            <button
              className="p-2 rounded-md hover:bg-accent"
              aria-label="back"
            >
              <FaArrowLeft size={16} />
            </button>

            <button
              className="p-2 rounded-md hover:bg-accent"
              aria-label="forward"
            >
              <FaArrowRight size={16} />
            </button>
            </div>
            {/* MENU DROPDOWN */}

            {/* Search Bar */}
            <div className="relative w-full max-w-xl col-span-8">
              <input
                type="search"
                placeholder="Search SOFTECHURE IT SERVICES"
                className="w-full h-10 rounded-full pl-4 pr-10 outline-none bg-input border focus:ring-2 focus:ring-primary"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2">
                <CiSearch size={20} />
              </button>
            </div>
          </div>

          {/* MOBILE SEARCH ICON */}
          <button className="sm:hidden p-2 rounded-md" aria-label="search">
            <CiSearch size={22} />
          </button>

          {/* RIGHT — LOGO */}
          <div className="flex items-center sm:gap-2">
            <img src="/images/logo.png" alt="Logo" className="h-8 w-auto" />
          </div>
        </div>
      </div>
    </header>
  );
}
