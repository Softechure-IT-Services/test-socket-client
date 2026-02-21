"use client";

import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import ButtonGroup from "@/app/components/ui/button-group";
import TabsModalDemo from "@/app/components/ui/groupmember";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/axios";
import { FaHeadphones } from "react-icons/fa6";
import { FaRegBell } from "react-icons/fa";
import { IoSearchOutline } from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface MainHeaderProps {
  id?: string;
  type?: "channel" | "dm";
  dmUser?: {
    id: number;
    name: string;
    avatar_url?: string;
  } | null;
  isPrivate?: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  isPrivate?: boolean;
}

interface Member {
  id: number;
  name: string;
  email: string;
}

function IconButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm p-2 border border-[var(--border-color)] hover:bg-[var(--accent)] text-[var(--sidebar-foreground)] transition-colors duration-150 cursor-pointer"
    >
      {children}
    </button>
  );
}

export default function MainHeader({ id, type, dmUser, isPrivate }: MainHeaderProps) {
  const { isOnline, socket } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const buttons = [
    { label: "Message", href: `/channel/${id}` },
    { label: "Files", href: `/channel/${id}/files` },
    { label: "Pins", href: `/channel/${id}/pins` },
  ];

  const handleLeaveChannel = async () => {
    if (!id) return;
    try {
      await api.post(`/channels/${id}/leave`);
      socket?.emit("leaveChannel", { channel_id: id });
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to leave channel", err);
    }
  };

  // ── Focus navbar search and pre-fill with context ─────────────────────────
  const handleSearchClick = () => {
    // Determine the pre-fill term:
    //  channel → "#channelname " so the user types their query after
    //  dm      → "@dmUsername "
    let prefill = "";
    if (type === "channel" && channel?.name) {
      prefill = `#${channel.name} `;
    } else if (type === "dm" && dmUser?.name) {
      prefill = `@${dmUser.name} `;
    }

    // Dispatch a custom event that app-navbar.tsx listens for
    window.dispatchEvent(
      new CustomEvent("focusNavSearch", {
        detail: { prefill, channelId: id, type },
      })
    );
  };

  useEffect(() => {
    if (!id || type !== "channel") return;
    const fetchChannelDetails = async () => {
      try {
        const res = await api.get(`/channels/${id}`);
        const data = res.data;
        setChannel(data.channel);
        setMembers(data.members);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchChannelDetails();
  }, [id, type]);

  useEffect(() => {
    if (!headerRef.current) return;
    const setHeight = () => {
      const height = headerRef.current!.offsetHeight;
      document.documentElement.style.setProperty("--chat-header-height", `${height}px`);
    };
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={headerRef}
      className="px-4 pt-4 pb-0 border-b border-[var(--border-color)] flex justify-between sticky top-[55px] z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]"
    >
      <div>
        <div className="flex gap-2">
          {type === "dm" && dmUser && (
            <img
              src={dmUser.avatar_url ? `/avatar/${dmUser.avatar_url}` : "/avatar/fallback.webp"}
              className="w-8 h-8 rounded-sm"
              alt={dmUser.name ?? "User"}
            />
          )}
          <h2 className="mb-1 text-2xl font-semibold">
            {loading
              ? "Loading..."
              : type === "dm"
              ? dmUser?.name ?? "Direct Message"
              : `# ${channel?.name ?? "Unnamed Channel"}`}
          </h2>
        </div>
        <ButtonGroup items={buttons} />
      </div>

      <div className="flex flex-row justify-center items-start gap-2">
        {type === "channel" && isPrivate && channel && (
          <TabsModalDemo channelId={channel.id} />
        )}

        <IconButton><FaHeadphones size={18} /></IconButton>
        <IconButton><FaRegBell size={18} /></IconButton>

        {/* Search icon — focuses navbar search pre-filled with current context */}
        <IconButton onClick={handleSearchClick}>
          <IoSearchOutline size={18} />
        </IconButton>

        {type === "channel" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton><MoreVertical size={18} /></IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleLeaveChannel}
              >
                Leave Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}