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
import api from "@/lib/axios";
import { usePresence } from "@/app/components/context/PresenceContext";

type Member = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
};
type ChannelInfo = {
  id: number;
  name: string;
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
  const [channel_info, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { seedUsers, isOnline } = usePresence();

  useEffect(() => {
    if (!isOpen || !channelId) return;
    setLoading(true);

    api
      .get(`/channels/${channelId}/members`)
      .then((res) => {
        const fetchedMembers = res.data.members;
        setMembers(fetchedMembers);
        setChannelInfo(res.data.channel);
        // Seed presence info
        if (typeof seedUsers === "function") {
          seedUsers(fetchedMembers);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [channelId, isOpen, seedUsers]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">
            # {channel_info?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Members ({members.length})
          </h3>

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
              {members.map((member) => {
                const memberOnline = isOnline(member.id);
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
                  >
                    <div className="relative">
                      <Image
                        src={member.avatar_url ? (member.avatar_url.startsWith("http") ? member.avatar_url : `/avatar/${member.avatar_url}`) : "/avatar/fallback.webp"}
                        alt={member.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover shrink-0"
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                          memberOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>

                    <div className="flex flex-col">
                      <span className="capitalize font-medium">
                        {member.name}
                      </span>
                      {memberOnline && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
