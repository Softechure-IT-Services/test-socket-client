"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Headphones, X, PhoneOff } from "lucide-react";

type HuddleInvite = {
  id: string;
  channel_id: number;
  channel_name: string | null;
  meeting_id: string;
  started_by: number;
  isDm?: boolean;
};

type Props = {
  invites: HuddleInvite[];
  onDecline: (id: string) => void;
};

function HuddleToastCard({
  invite,
  onDecline,
}: {
  invite: HuddleInvite;
  onDecline: () => void;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDecline, 300);
  }, [onDecline]);

  useEffect(() => {
    const timer = setTimeout(dismiss, 30000); // auto-dismiss after 30s
    return () => clearTimeout(timer);
  }, [dismiss]);

  const handleJoin = () => {
    router.push(
      `/huddle?meeting_id=${invite.meeting_id}&channel_id=${invite.channel_id}`
    );
    dismiss();
  };

  const label = invite.isDm
    ? "DM Huddle"
    : invite.channel_name
    ? `#${invite.channel_name}`
    : "a channel";

  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-2xl border border-[var(--border-color)] bg-sidebar shadow-2xl p-4 transition-all duration-300 ${
        exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
        <Headphones className="h-5 w-5 text-indigo-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
          Huddle started
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {label}
        </p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleJoin}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 transition-colors"
          >
            <Headphones className="h-3.5 w-3.5" />
            Join
          </button>
          <button
            onClick={dismiss}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] hover:bg-accent text-xs font-medium py-1.5 transition-colors"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-accent transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function HuddleInviteToast({ invites, onDecline }: Props) {
  if (!invites.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end">
      {invites.map((invite) => (
        <HuddleToastCard
          key={invite.id}
          invite={invite}
          onDecline={() => onDecline(invite.id)}
        />
      ))}
    </div>
  );
}
