"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

type Member = {
  id: number;
  username: string;
  email: string;
};

type ChannelMembersProps = {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName?: string;
};

export default function Channelmambers({
  isOpen,
  onClose,
  channelId,
  channelName = "Channel",
}: ChannelMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !channelId) return;

    setLoading(true);

    fetch(`/api/channels/${channelId}/members`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((data) => setMembers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [channelId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">
            # {channelName}
          </DialogTitle>

         
        </DialogHeader>

        {/* Content */}
        <div className="space-y-3">
          {/* <h3 className="text-sm font-semibold text-muted-foreground">
            Members ({members.length})
          </h3> */}

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading members...
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members found.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
                >
                  <Image
                    src="/1.jpg"
                    alt={member.username}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />

                  <span className="capitalize font-medium">
                    {member.username}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
