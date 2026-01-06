"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/context/userId_and_connection/provider";
import { useDebounce } from "@/hooks/useDebounce";

type User = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  type: "channel" | "dm";
};

export default function CreateModal({ open, onClose, type }: Props) {
  const [channelName, setChannelName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
const {  user } = useAuth();

useEffect(() => {
  if (!isPrivate) {
    setSelectedUsers([]);
    setSearch("");
  }
}, [isPrivate]);


const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (!debouncedSearch) {
    setUsers([]);
    return;
  }

  if (!(type === "dm" || isPrivate)) return;

  const controller = new AbortController();

  const fetchUsers = async () => {
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(
          debouncedSearch
        )}&exclude=${user?.id}`,
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("User search error", err);
      }
    }
  };

  fetchUsers();

  return () => controller.abort();
}, [debouncedSearch, type, isPrivate, user?.id]);



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
  if (type !== "channel") return;
  if (!channelName.trim()) return;

  try {
   await fetch("/api/channels", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  body: JSON.stringify({
    name: channelName,
    isPrivate,
    memberIds: isPrivate
      ? selectedUsers.map((u) => Number(u.id))
      : [],
  }),
});

    resetAndClose();
  } catch (err) {
    console.error("Create channel failed", err);
  }
};


  const resetAndClose = () => {
    setChannelName("");
    setSearch("");
    setIsPrivate(false);
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === "channel" ? "Create New Channel" : "New Direct Message"}
          </DialogTitle>
        </DialogHeader>

        {/* CHANNEL NAME */}
        {type === "channel" && (
          <Input
            placeholder="Channel name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
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

        {/* ACTION */}
        <Button onClick={handleSubmit}>
          {type === "channel" ? "Create Channel" : "Start Chat"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
