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
const uuidv4 = () => crypto.randomUUID();
import { useDebounce } from "@/hooks/useDebounce";
import { UserAvatar } from "@/app/components/MessageMeta";
import { usePresence } from "@/app/components/context/PresenceContext";
import { formatRelativeTime } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MainHeaderProps {
  id?: string;
  type?: "channel" | "dm";
  dmUser?: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
    is_online?: boolean | null;
    last_seen?: string | null;
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
  username: string;
  email: string;
  avatar_url?: string | null;
  is_online?: boolean;  // Added for presence
  last_seen?: string | null; // Added for presence
}

interface SearchUser {
  id: string;
  name: string;
  username: string;
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
      className={`flex rounded-sm p-2 border border-[var(--border-color)] hover:bg-[var(--accent)] text-[var(--sidebar-foreground)] transition-colors duration-150 cursor-pointer ${
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
  const { seedUsers, isOnline, getLastSeen } = usePresence(); // Use presence context

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get(`/channels/${channelId}/members`);
      const fetchedMembers = res.data.members ?? [];
      setMembers(fetchedMembers);
      // Seed presence info for all members
      seedUsers(fetchedMembers);
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
    const { sweetConfirm } = await import("@/lib/sweetalert");
    const confirmed = await sweetConfirm({
      title: "Remove member",
      text: `Remove ${member.name} from #${channelName}?`,
      confirmButtonText: "Remove",
      cancelButtonText: "Keep",
    });
    if (!confirmed) return;

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
                      <UserAvatar name={u.name} avatarUrl={u.avatar_url} size="sm" />
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
              <p className="text-xs  px-0.5">
                Searching…
              </p>
            )}
            {!searching &&
              debouncedSearch.trim() &&
              searchResults.length === 0 && (
                <p className="text-xs  px-0.5">
                  No users found
                </p>
              )}
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wider  -mb-1">
          {loadingMembers
            ? "Loading…"
            : `${members.length} member${members.length !== 1 ? "s" : ""}`}
        </p>

        <div className="max-h-72 overflow-y-auto -mx-6 px-6 space-y-0.5">
          {members.map((member) => {
            const isSelf =
              String(member.id) === String(currentUserId);
            const isOwner = isSelf && isCreator;

            // Get real-time presence data
            const memberOnline = isOnline(member.id);
            const memberLastSeen = getLastSeen(member.id) ?? member.last_seen;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      size="md"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        memberOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}
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
                    <p className="text-[11px] truncate text-[var(--accent-foreground)]">
                      {memberOnline ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active now</span>
                      ) : memberLastSeen ? (
                        `Last seen ${formatRelativeTime(memberLastSeen)}`
                      ) : (
                        member.email
                      )}
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
  const [localDmUser, setLocalDmUser] = useState(dmUser);
  const [loading, setLoading] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  // null = loading (API hasn't responded yet), true/false = known
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const { seedUsers, isOnline: presenceIsOnline, getLastSeen } = usePresence();
  const dmUserId = localDmUser?.id ?? null;
  const dmPresenceOnline = dmUserId
    ? presenceIsOnline(dmUserId)
    : localDmUser?.is_online ?? false;
  const dmPresenceLastSeen =
    (dmUserId ? getLastSeen(dmUserId) : null) ?? localDmUser?.last_seen ?? null;
  const dmPresenceSubtitle = dmPresenceOnline
    ? ""
    : dmPresenceLastSeen
    ? `Last seen ${formatRelativeTime(dmPresenceLastSeen) ?? ""}`
    : "Offline";

  const basePath = type === "dm" ? "/dm" : "/channel";
  const buttons = [
    ...(type === "channel"
      ? [
          { label: "Message", href: `${basePath}/${id}` },
          { label: "Files", href: `${basePath}/${id}/files` },
          { label: "Pins", href: `${basePath}/${id}/pins` },
        ]
      : 
        [
          { label: "Message", href: `${basePath}/${id}` },
          { label: "Files", href: `${basePath}/${id}/files` },
          { label: "Pins", href: `${basePath}/${id}/pins` },
        ]
    ),
  ];

  const isCreator =
    channel?.created_by != null &&
    String(channel.created_by) === String(user?.id);

  const [huddleActive, setHuddleActive] = useState(false);

  // Keep "huddle active" indicator in sync (API + realtime)
  useEffect(() => {
    if (!id || type !== "channel") {
      setHuddleActive(false);
      return;
    }

    let cancelled = false;
    api
      .get(`/huddle/channel/${id}/active`)
      .then((res) => {
        if (cancelled) return;
        setHuddleActive(!!res.data?.active);
      })
      .catch(() => {
        if (cancelled) return;
        setHuddleActive(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, type]);

  useEffect(() => {
    if (!socket || !id) return;
    const onStarted = (p: any) => {
      if (String(p?.channel_id ?? p?.channelId) !== String(id)) return;
      setHuddleActive(true);
    };
    const onEnded = (p: any) => {
      if (String(p?.channel_id ?? p?.channelId) !== String(id)) return;
      setHuddleActive(false);
    };
    socket.on("huddleStarted", onStarted);
    socket.on("huddleEnded", onEnded);
    return () => {
      socket.off("huddleStarted", onStarted);
      socket.off("huddleEnded", onEnded);
    };
  }, [socket, id]);

  const handleHuddleClick = async () => {
    if (!id) return;
    try {
      // Always start-or-resume on the backend so everyone joins the same active room.
      const res = await api.post(`/huddle/channel/${id}/start`);
      const roomId = res.data?.room_id ?? res.data?.session?.meeting_id;
      const url = `/huddle?channel_id=${id}${roomId ? `&meeting_id=${encodeURIComponent(roomId)}` : ""}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to start huddle:", err);
      // Fallback: still open the channel-based huddle page
      const url = `/huddle?channel_id=${id}`;
      window.open(url, "_blank");
    }
  };

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
    else if (type === "dm" && (localDmUser?.username || dmUser?.name))
      prefill = `@${localDmUser?.username || dmUser?.name} `;
    window.dispatchEvent(
      new CustomEvent("focusNavSearch", {
        detail: { prefill, channelId: id, type },
      })
    );
  };

  useEffect(() => {
    // Reset state on every channel/type change
    setChannel(null);
    setLoading(true);
    setIsMember(null);

    if (!id || type !== "channel") {
      // DMs: props already carry dmUser from layout — no fetch needed
      setLoading(false);
      setIsMember(true);
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/channels/${id}`);
        setChannel(res.data.channel);
        setIsMember(res.data.is_member ?? true);
      } catch (err) {
        console.error(err);
        setIsMember(true);
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

  useEffect(() => setLocalDmUser(dmUser), [dmUser]);
  useEffect(() => {
    if (localDmUser) {
      seedUsers([localDmUser]);
    }
  }, [localDmUser, seedUsers]);

  useEffect(() => {
    if (!socket) return;
    const handleUserUpdated = (updatedUser: any) => {
      if (localDmUser && String(localDmUser.id) === String(updatedUser.id)) {
        setLocalDmUser((prev: any) => ({
          ...prev,
          name: updatedUser.name ?? prev.name,
          username: updatedUser.username ?? prev.username,
          avatar_url: updatedUser.avatar_url !== undefined ? updatedUser.avatar_url : prev.avatar_url,
        }));
        seedUsers([updatedUser]);
      }
    };
    socket.on("userUpdated", handleUserUpdated);
    return () => { socket.off("userUpdated", handleUserUpdated); };
  }, [socket, localDmUser]);

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
        className="px-4 pt-4 pb-0 border-b border-[var(--border-color)] flex justify-between sticky top-[55px] z-50 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] mainheader"
      >
        <div>
          <div className="flex gap-2">
            {type === "dm" && localDmUser && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar
                    name={localDmUser.name}
                    avatarUrl={localDmUser.avatar_url}
                    size="md"
                    rounded="sm"
                    className="shrink-0"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[var(--sidebar)] ${
                      dmPresenceOnline ? "bg-emerald-500" : "bg-muted-foreground/50"
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold truncate">
                      {localDmUser.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        dmPresenceOnline ? "bg-emerald-100 text-emerald-700" : "bg-muted text-black"
                      }`}
                    >
                      {dmPresenceOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {dmPresenceSubtitle}
                  </span>
                </div>
              </div>
            )}
            <h2 className="mb-1 text-2xl font-semibold">
              {loading
                ? "Loading..."
                : type === "dm"
                  ? 
                  //(localDmUser?.name ?? "Direct Message")
                  ""
                  : `# ${channel?.name ?? "Unnamed Channel"}`}
            </h2>
            {/* Show "removed" badge — only for private channels, only when confirmed non-member */}
            {isMember === false &&
              channel?.is_private === true &&
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

          <IconButton onClick={handleHuddleClick} title="Start Huddle">
            <span className="relative inline-flex">
              <FaHeadphones size={18} />
              {huddleActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
              )}
            </span>
          </IconButton>

          <IconButton
            onClick={handleSearchClick}
            title="Search in channel"
          >
            <IoSearchOutline size={18} />
          </IconButton>

          {type === "channel" && isMember === true && (
            <DropdownMenu>
              <DropdownMenuTrigger
                title="Channel options"
                className="rounded-sm p-2 border border-[var(--border-color)] hover:bg-[var(--accent)] text-[var(--sidebar-foreground)] transition-colors duration-150 cursor-pointer outline-none"
              >
                <MoreVertical size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={async () => {
                    const { sweetConfirm } = await import("@/lib/sweetalert");
                    const confirmed = await sweetConfirm({
                      title: "Leave channel",
                      text: `Leave #${channel?.name ?? "this channel"}?`,
                      confirmButtonText: "Leave",
                      cancelButtonText: "Stay",
                    });
                    if (confirmed) {
                      handleLeaveChannel();
                    }
                  }}
                >
                  Leave Channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Removed banner — only for private channels, only when confirmed non-member */}
      {isMember === false &&
        channel?.is_private === true &&
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
