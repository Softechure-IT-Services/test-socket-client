"use client";

import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import ButtonGroup from "@/app/components/ui/button-group";
import { useEffect, useState, useRef, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  MoreVertical,
  Users,
  UserPlus,
  UserMinus,
  Search,
  X,
  Crown,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  is_private?: boolean;
  created_by?: number;
}

interface Member {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface SearchUser {
  id: string;
  name: string;
  avatar_url?: string | null;
}

// ─── Icon button ───────────────────────────────────────────────────────────────
function IconButton({
  children,
  onClick,
  title,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-sm p-2 border border-[var(--border-color)] hover:bg-[var(--accent)] text-[var(--sidebar-foreground)] transition-colors duration-150 cursor-pointer ${
        active ? "bg-[var(--accent)]" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// ─── Members management dialog ─────────────────────────────────────────────────
function MembersPanel({
  open,
  onClose,
  channelId,
  channelName,
  currentUserId,
  isCreator,
}: {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  currentUserId: number | string | undefined;
  isCreator: boolean;
}) {
  const { user, socket } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get(`/channels/${channelId}/members`);
      setMembers(res.data.members ?? []);
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, fetchMembers]);

  // ─── Listen for member add/remove events to auto-update the list ────
  useEffect(() => {
    if (!socket || !open) return;

    const handleMemberAdded = (data: {
      channelId: number;
      member: Member;
    }) => {
      if (String(data.channelId) !== String(channelId)) return;
      setMembers((prev) => {
        if (prev.some((m) => m.id === data.member.id)) return prev;
        return [...prev, data.member];
      });
    };

    const handleMemberRemoved = (data: {
      channelId: number;
      userId: number;
    }) => {
      if (String(data.channelId) !== String(channelId)) return;
      setMembers((prev) =>
        prev.filter((m) => m.id !== data.userId)
      );
    };

    socket.on("memberAdded", handleMemberAdded);
    socket.on("memberRemoved", handleMemberRemoved);

    return () => {
      socket.off("memberAdded", handleMemberAdded);
      socket.off("memberRemoved", handleMemberRemoved);
    };
  }, [socket, open, channelId]);

  useEffect(() => {
    if (!debouncedSearch.trim() || !isCreator) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    (async () => {
      setSearching(true);
      try {
        const res = await api.get("/users/search", {
          params: { q: debouncedSearch, exclude: user?.id },
          signal: controller.signal,
        });
        const memberIds = new Set(members.map((m) => String(m.id)));
        setSearchResults(
          (res.data as SearchUser[]).filter(
            (u) => !memberIds.has(String(u.id))
          )
        );
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        setSearching(false);
      }
    })();
    return () => controller.abort();
  }, [debouncedSearch, members, isCreator, user?.id]);

  const handleAdd = async (targetUser: SearchUser) => {
    setAddingId(targetUser.id);
    try {
      await api.post(`/channels/${channelId}/members`, {
        userId: targetUser.id,
      });
      setSearchQuery("");
      setSearchResults([]);
      // member list will auto-update via socket event
    } catch (err) {
      console.error("Add member failed", err);
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!confirm(`Remove ${member.name} from #${channelName}?`))
      return;
    setRemovingId(member.id);
    try {
      await api.delete(
        `/channels/${channelId}/members/${member.id}`
      );
      // member list will auto-update via socket event
    } catch (err) {
      console.error("Remove member failed", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users size={16} className="opacity-60" />
            Members
            <span className="font-normal text-muted-foreground">
              · #{channelName}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isCreator && (
          <div className="space-y-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
              />
              <Input
                placeholder="Add people by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-md border bg-popover shadow-sm overflow-hidden">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          u.avatar_url
                            ? `/avatar/${u.avatar_url}`
                            : "/avatar/fallback.webp"
                        }
                        alt={u.name}
                        className="w-7 h-7 rounded-sm object-cover"
                      />
                      <span className="text-sm">{u.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 gap-1 text-xs"
                      disabled={addingId === u.id}
                      onClick={() => handleAdd(u)}
                    >
                      <UserPlus size={12} />
                      {addingId === u.id ? "Adding…" : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <p className="text-xs text-muted-foreground px-0.5">
                Searching…
              </p>
            )}
            {!searching &&
              debouncedSearch.trim() &&
              searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground px-0.5">
                  No users found
                </p>
              )}
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground -mb-1">
          {loadingMembers
            ? "Loading…"
            : `${members.length} member${members.length !== 1 ? "s" : ""}`}
        </p>

        <div className="max-h-72 overflow-y-auto -mx-6 px-6 space-y-0.5">
          {members.map((member) => {
            const isSelf =
              String(member.id) === String(currentUserId);
            const isOwner = isSelf && isCreator;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        member.avatar_url
                          ? `/avatar/${member.avatar_url}`
                          : "/avatar/fallback.webp"
                      }
                      alt={member.name}
                      className="w-8 h-8 rounded-sm object-cover"
                    />
                    {isOwner && (
                      <Crown
                        size={10}
                        className="absolute -top-1 -right-1 text-amber-400 drop-shadow"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {member.name}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-muted text-primary px-1.5 py-0.5 rounded-full shrink-0">
                          you
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                          owner
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                {isCreator && !isSelf && (
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={removingId === member.id}
                    title="Remove from channel"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 p-1.5 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-40 cursor-pointer"
                  >
                    {removingId === member.id ? (
                      <span className="text-[10px] leading-none">
                        …
                      </span>
                    ) : (
                      <UserMinus size={14} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main header ───────────────────────────────────────────────────────────────
export default function MainHeader({
  id,
  type,
  dmUser,
  isPrivate,
}: MainHeaderProps) {
  const { socket, user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const buttons = [
    { label: "Message", href: `/channel/${id}` },
    { label: "Files", href: `/channel/${id}/files` },
    { label: "Pins", href: `/channel/${id}/pins` },
  ];

  const isCreator =
    channel?.created_by != null &&
    String(channel.created_by) === String(user?.id);

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

  const handleSearchClick = () => {
    let prefill = "";
    if (type === "channel" && channel?.name)
      prefill = `#${channel.name} `;
    else if (type === "dm" && dmUser?.name)
      prefill = `@${dmUser.name} `;
    window.dispatchEvent(
      new CustomEvent("focusNavSearch", {
        detail: { prefill, channelId: id, type },
      })
    );
  };

  useEffect(() => {
    if (!id || type !== "channel") return;
    (async () => {
      try {
        const res = await api.get(`/channels/${id}`);
        setChannel(res.data.channel);
        if (res.data.is_member !== undefined) {
          setIsMember(res.data.is_member);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, type]);

  // ─── Listen for removal / addition events ──────────────────────────
  useEffect(() => {
    if (!socket || !id) return;

    const handleRemovedFromChannel = (data: {
      channelId: number;
      channelName?: string;
    }) => {
      if (String(data.channelId) === String(id)) {
        setIsMember(false);
        setMembersOpen(false); // close members panel
      }
    };

    const handleAddedToChannel = (data: { channelId: number }) => {
      if (String(data.channelId) === String(id)) {
        setIsMember(true);
      }
    };

    socket.on("removedFromChannel", handleRemovedFromChannel);
    socket.on("addedToChannel", handleAddedToChannel);

    return () => {
      socket.off("removedFromChannel", handleRemovedFromChannel);
      socket.off("addedToChannel", handleAddedToChannel);
    };
  }, [socket, id]);

  useEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    const setHeight = () => {
      document.documentElement.style.setProperty(
        "--chat-header-height",
        `${el.offsetHeight}px`
      );
    };
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={headerRef}
        className="px-4 pt-4 pb-0 border-b border-[var(--border-color)] flex justify-between sticky top-[55px] z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]"
      >
        <div>
          <div className="flex gap-2">
            {type === "dm" && dmUser && (
              <img
                src={
                  dmUser.avatar_url
                    ? `/avatar/${dmUser.avatar_url}`
                    : "/avatar/fallback.webp"
                }
                className="w-8 h-8 rounded-sm"
                alt={dmUser.name ?? "User"}
              />
            )}
            <h2 className="mb-1 text-2xl font-semibold">
              {loading
                ? "Loading..."
                : type === "dm"
                  ? (dmUser?.name ?? "Direct Message")
                  : `# ${channel?.name ?? "Unnamed Channel"}`}
            </h2>
            {/* Show "removed" badge */}
            {!isMember &&
              isPrivate &&
              type === "channel" &&
              !loading && (
                <span className="self-center text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  Removed
                </span>
              )}
          </div>
          <ButtonGroup items={buttons} />
        </div>

        <div className="flex flex-row justify-center items-start gap-2">
          {type === "channel" && isPrivate && isMember && (
            <IconButton
              onClick={() => setMembersOpen(true)}
              title={
                isCreator ? "Manage members" : "View members"
              }
              active={membersOpen}
            >
              <div className="relative flex items-center">
                <Users size={16} />
                {isCreator && (
                  <Crown
                    size={9}
                    className="absolute -top-1.5 -right-1.5 text-amber-400"
                  />
                )}
              </div>
            </IconButton>
          )}

          <IconButton>
            <FaHeadphones size={18} />
          </IconButton>
          <IconButton>
            <FaRegBell size={18} />
          </IconButton>

          <IconButton
            onClick={handleSearchClick}
            title="Search in channel"
          >
            <IoSearchOutline size={18} />
          </IconButton>

          {type === "channel" && isMember && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton>
                  <MoreVertical size={18} />
                </IconButton>
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

      {/* Removed banner */}
      {!isMember &&
        isPrivate &&
        type === "channel" &&
        !loading && (
          <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 px-4 py-3 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              You have been removed from this channel. You can no
              longer send messages or see new activity.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-1 text-xs text-red-500 hover:text-red-700 underline cursor-pointer"
            >
              Go to home
            </button>
          </div>
        )}

      {type === "channel" &&
        isPrivate &&
        channel &&
        isMember && (
          <MembersPanel
            open={membersOpen}
            onClose={() => setMembersOpen(false)}
            channelId={channel.id}
            channelName={channel.name}
            currentUserId={user?.id}
            isCreator={isCreator}
          />
        )}
    </>
  );
}