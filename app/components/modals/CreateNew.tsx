
"use client";
import api from "@/lib/axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { UserAvatar } from "@/app/components/MessageMeta";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  avatar_url?: string;
  is_online?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  type: "channel" | "dm" | "forward";
  forwardMessageId?: string | null;
};

export default function CreateModal({ open, onClose, type, forwardMessageId }: Props) {
  const [channelName, setChannelName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedForward, setSelectedForward] = useState<any[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const debouncedChannelName = useDebounce(channelName, 400);

  // Reset user search list when private toggle turned off
  useEffect(() => {
    if (!isPrivate) {
      setSelectedUsers([]);
      setSearch("");
      setUsers([]);
    }
  }, [isPrivate]);

  // ── Forward search (default list on open, filtered on type) ────────────────
  useEffect(() => {
     if (!open) return;  
    if (type !== "forward") return;

    const controller = new AbortController();

    const fetchSearch = async () => {
      try {
        const res = await api.get("/channels/search-user-and-channel", {
          params: debouncedSearch.trim() ? { q: debouncedSearch } : {},
          signal: controller.signal,
        });
        setChannels(res.data ?? []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Forward search failed", err);
      }
    };

    fetchSearch();
    return () => controller.abort();
  }, [open,debouncedSearch, type]);

  // ── DM / private channel user search (default list on open) ───────────────
  useEffect(() => {
     if (!open) return;  
    if (!(type === "dm" || (type === "channel" && isPrivate))) return;

    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const res = await api.get(`/users/search`, {
          params: {
            ...(debouncedSearch.trim() ? { q: debouncedSearch } : {}),
            exclude: user?.id,
          },
          signal: controller.signal,
        });
        setUsers(res.data);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("User search error", err);
      }
    };

    fetchUsers();
    return () => controller.abort();
  }, [open,debouncedSearch, type, isPrivate, user?.id]);

  // ── Channel name availability check ───────────────────────────────────────
  useEffect(() => {
    if (type !== "channel") return;

    if (!debouncedChannelName.trim()) {
      setNameStatus("idle");
      return;
    }

    const controller = new AbortController();

    const checkName = async () => {
      try {
        setNameStatus("checking");
        const res = await api.post(
          "/channels",
          { name: debouncedChannelName.trim(), create: false },
          { signal: controller.signal }
        );
        setNameStatus(res.data.data.available ? "available" : "taken");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Name check failed", err);
          setNameStatus("idle");
        }
      }
    };

    checkName();
    return () => controller.abort();
  }, [debouncedChannelName, type]);

  const toggleUser = (u: User) => {
    if (type === "dm") {
      setSelectedUsers([u]);
      return;
    }
    setSelectedUsers((prev) =>
      prev.some((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u]
    );
  };

  const handleSubmit = async () => {
    try {
      if (type === "channel") {
        if (!channelName.trim() || nameStatus !== "available") return;

        const res = await api.post("/channels", {
          name: channelName,
          isPrivate,
          memberIds: isPrivate ? selectedUsers.map((u) => Number(u.id)) : [],
          create: true,
        });

        router.push(`/channel/${res.data.data.id}`);
        resetAndClose();
        return;
      }

      if (type === "dm") {
        if (selectedUsers.length !== 1) return;

        const res = await api.post(`/dm/with/${selectedUsers[0].id}`);
        if (!res.data.dm_id) throw new Error("Failed to create DM");

        router.push(`/dm/${res.data.dm_id}`);
        resetAndClose();
      }
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const resetAndClose = () => {
    setChannelName("");
    setSearch("");
    setIsPrivate(false);
    setSelectedUsers([]);
    setUsers([]);
    setChannels([]);
    setSelectedForward([]);
    setForwarding(false);
    setNameStatus("idle");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === "channel" && "Create New Channel"}
            {type === "dm" && "New Direct Message"}
            {type === "forward" && "Forward Message"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Channel name ───────────────────────────────────────────────── */}
        {type === "channel" && (
          <div className="space-y-1">
            <Input
              placeholder="Channel name*"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
            {nameStatus === "checking" && (
              <p className="text-xs text-muted-foreground">Checking availability...</p>
            )}
            {nameStatus === "available" && (
              <p className="text-xs text-green-600">Channel name is available</p>
            )}
            {nameStatus === "taken" && (
              <p className="text-xs text-red-600">Channel name already exists</p>
            )}
          </div>
        )}

        {/* ── Private toggle ─────────────────────────────────────────────── */}
        {type === "channel" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="private">Private channel</Label>
            <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        )}

        {/* ── DM / private channel user picker ──────────────────────────── */}
        {(type === "dm" || (type === "channel" && isPrivate)) && (
          <>
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Selected badges */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1"
                  >
                    {u.name}
                    <button
                      onClick={() =>
                        setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))
                      }
                      className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
              {users.length === 0 && (
                <p className="text-xs text-black text-center py-4">
                  {search.trim() ? "No users found" : "Loading users..."}
                </p>
              )}
              {users.map((u) => {
                const active = selectedUsers.some((x) => x.id === u.id);
                const isOnline = Boolean(u.is_online);
                const displayName = u.name || "Unknown";
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u)}
                    className={`w-full text-left flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <UserAvatar
                          name={displayName}
                          avatarUrl={u.avatar_url ?? null}
                          size="sm"
                          rounded="full"
                        />
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                            isOnline ? "bg-emerald-500" : "bg-muted-foreground/70"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-[10px] truncate">
                          {isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                    {active && <span className="text-xs font-semibold">✓</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Forward picker ─────────────────────────────────────────────── */}
        {type === "forward" && (
          <>
            <Input
              placeholder="Search channels or people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-60 overflow-y-auto rounded-md border p-2 space-y-1">
              {channels.length === 0 ? (
                <p className="text-xs text-black text-center py-4">
                  {search.trim() ? "No results found" : "Loading..."}
                </p>
              ) : (
                channels.map((item) => {
                  const isSelected = selectedForward.some((s) => s.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedForward((prev) =>
                          isSelected
                            ? prev.filter((s) => s.id !== item.id)
                            : [...prev, item]
                        )
                      }
                      className={`cursor-pointer rounded px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span>
                        {item.kind === "channel" ? "# " : "👤 "}
                        {item.name}
                      </span>
                      {isSelected && <span className="text-xs font-semibold opacity-80">✓</span>}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected chips */}
            {selectedForward.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedForward.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1"
                  >
                   {item.name}
                    <button
                      onClick={() =>
                        setSelectedForward((prev) => prev.filter((s) => s.id !== item.id))
                      }
                      className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <Button
              onClick={async () => {
                if (!forwardMessageId || selectedForward.length === 0) return;
                setForwarding(true);
                try {
                  const results = await Promise.all(
                    selectedForward.map(async (item) => {
                      let targetId = item.id;
                      if (item.kind === "user" || item.kind === "dm") {
                        const dmRes = await api.post(`/dm/with/${item.userId || item.id}`);
                        targetId = dmRes.data.dm_id;
                      }
                      const res = await api.post(
                        `/channels/messages/${forwardMessageId}/forward/${targetId}`
                      );
                      return { item, targetId, res: res.data };
                    })
                  );

                  const lastResult = results[results.length - 1];
                  const { item: lastItem, targetId: lastTargetId, res: lastRes } = lastResult;

                  // Use the ID from the forward API response as the final authority
                  const finalId = lastRes?.message?.channel_id || lastTargetId;
                  
                  // Determine if the destination is a DM
                  const isDm = lastRes?.message?.channel?.is_dm ?? 
                               (lastItem.kind === "user" || lastItem.kind === "dm" || !!lastItem.is_dm);

                  if (isDm) {
                    router.push(`/dm/${finalId}`);
                  } else {
                    router.push(`/channel/${finalId}`);
                  }
                  
                  resetAndClose();
                } catch (err) {
                  console.error("Forward failed", err);
                } finally {
                  setForwarding(false);
                }
              }}
              disabled={selectedForward.length === 0 || forwarding}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {forwarding
                ? "Forwarding..."
                : selectedForward.length > 1
                ? `Forward to ${selectedForward.length}`
                : "Forward"}
            </Button>
          </>
        )}

        {/* ── Submit (channel / dm) ──────────────────────────────────────── */}
        {type !== "forward" && (
          <Button
            onClick={handleSubmit}
            disabled={
              (type === "channel" &&
                (nameStatus !== "available" || !channelName.trim())) ||
              (type === "dm" && selectedUsers.length !== 1)
            }
            className="w-full bg-sidebar text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {type === "channel" ? "Create Channel" : "Start Chat"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}