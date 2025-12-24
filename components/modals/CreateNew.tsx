"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/context/userId_and_connection/provider";

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
const {  userId } = useAuth();

useEffect(() => {
  if (!isPrivate) {
    setSelectedUsers([]);
    setSearch("");
  }
}, [isPrivate]);

// Fetch users from the backend
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: User[] = await res.json();

      const filtered = data.filter(
        (user) => String(user.id) !== String(userId)
      );

      setUsers(filtered);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  if (type === "dm" || isPrivate) fetchUsers();
}, [type, isPrivate, userId]);


  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

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
