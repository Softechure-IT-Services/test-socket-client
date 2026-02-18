"use client";
import api from "@/lib/axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";
import { useDebounce } from "@/hooks/useDebounce";
import { Router } from "lucide-react";
import { useRouter } from "next/navigation";
import { channel } from "process";

type User = {
  id: string;
  name: string;
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
const {  user } = useAuth();
const router = useRouter();
const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
const [channels, setChannels] = useState<any[]>([]);
const debouncedSearch = useDebounce(search, 300);
const debouncedChannelName = useDebounce(channelName, 400);


useEffect(() => {
  if (!isPrivate) {
    setSelectedUsers([]);
    setSearch("");
  }
}, [isPrivate]);



useEffect(() => {
  if (type !== "forward") return;

  if (!debouncedSearch.trim()) {
    setChannels([]);
    return;
  }

  const controller = new AbortController();

  const fetchSearch = async () => {
    try {
      const res = await api.get("/channels/search-user-and-channel", {
        params: { q: debouncedSearch },
        signal: controller.signal
      });

      setChannels(res.data ?? []);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Forward search failed", err);
      }
    }
  };

  fetchSearch();

  return () => controller.abort();
}, [debouncedSearch, type]);

useEffect(() => {
  if (!debouncedSearch) {
    setUsers([]);
    return;
  }

  if (!(type === "dm" || isPrivate)) return;

  const controller = new AbortController();

  const fetchUsers = async () => {
    try {
        const res = await api.get(`/users/search`, {
          params: { q: debouncedSearch, exclude: user?.id },
          signal: controller.signal,
        });

        setUsers(res.data);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("User search error", err);
      }
    }
  };

  fetchUsers();

  return () => controller.abort();
}, [debouncedSearch, type, isPrivate, user?.id]);

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
        {
          name: debouncedChannelName.trim(),
          create: false, // 🔥 ONLY CHECK
        },
        { signal: controller.signal }
      );

      if (res.data.data.available) {
        setNameStatus("available");
      } else {
        setNameStatus("taken");
      }
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



  const filteredUsers = users;


  const toggleUser = (user: User) => {
    if (type === "dm") {
      setSelectedUsers([user]);
      return;
    }

    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

const handleSubmit = async () => {
  try {
    if (type === "channel") {
    if (!channelName.trim()) return;
    if (nameStatus !== "available") return; // 👈 block

    const res = await api.post("/channels", {
      name: channelName,
      isPrivate,
      memberIds: isPrivate ? selectedUsers.map(u => Number(u.id)) : [],
      create: true, // 👈 REAL CREATE
    });

    const channelId = res.data.data.id;

    router.push(`/channel/${channelId}`);
    resetAndClose();
    return;
  }


    // ✅ DM CREATE FLOW
    if (type === "dm") {
      if (selectedUsers.length !== 1) return;

      const otherUserId = selectedUsers[0].id;

        const res = await api.post(`/dm/with/${otherUserId}`);

        const data = res.data;

        if (!data.dm_id) throw new Error("Failed to create DM");

      // ✅ Redirect to REAL DM channel
      router.push(`/channel/${data.dm_id}`);

      resetAndClose();
    }
  } catch (err) {
    console.error("Create failed", err);
  }
}; 



  // const resetAndClose = () => {
  //   setChannelName("");
  //   setSearch("");
  //   setIsPrivate(false);
  //   setSelectedUsers([]);
  //   onClose();
  // };

const resetAndClose = () => {
  setChannelName("");
  setSearch("");
  setIsPrivate(false);
  setSelectedUsers([]);
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

        {/* CHANNEL NAME */}
        {type === "channel" && (
        <div className="space-y-1">
          <Input
            placeholder="Channel name"
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



        {/* PRIVATE TOGGLE */}
        {type === "channel" && (
          <div className="flex items-center justify-between">
            <Label htmlFor="private">Private channel</Label>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
        )}

        {/* USER SEARCH */}
      {(type === "dm" || (type === "channel" && isPrivate)) && (
  <>
    <Input
      placeholder="Search users..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
      {filteredUsers.map((user) => {
        const active = selectedUsers.some((u) => u.id === user.id);

        return (
          <div
            key={user.id}
            onClick={() => toggleUser(user)}
            className={`cursor-pointer rounded px-3 py-2 text-sm
              ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
            `}
          >
            {user.name}
          </div>
        );
      })}
    </div>
  </>
)}

{type === "forward" && (
  <>
    <Input
      placeholder="Search channels..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <div className="max-h-60 overflow-y-auto rounded-md border p-2 space-y-1">
      {channels.map((item) => (
  <div
    key={item.id}
    onClick={async () => {
      if (!forwardMessageId) return;

      await api.post(
        `/channels/messages/${forwardMessageId}/forward/${item.id}`
      );

      resetAndClose();
      router.push(`/channel/${item.id}`);
    }}
    className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-muted"
  >
    {item.kind === "channel" ? "# " : "👤 "}
    {item.name}
  </div>
))}
    </div>
  </>
)}

        {/* ACTION */}
        {/* <Button onClick={handleSubmit}>
          {type === "channel" ? "Create Channel" : "Start Chat"}
        </Button> */}
{type !== "forward" && (
  <Button
    onClick={handleSubmit}
    disabled={
      (type === "channel" &&
        (nameStatus !== "available" || !channelName.trim())) ||
      (type === "dm" && selectedUsers.length !== 1)
    }
    className="cursor-pointer"
  >
    {type === "channel" ? "Create Channel" : "Start Chat"}
  </Button>
)}


      </DialogContent>
    </Dialog>
  );
}
