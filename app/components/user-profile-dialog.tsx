"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MessageSquare } from "lucide-react";

import api from "@/lib/axios";
import { UserAvatar } from "@/app/components/MessageMeta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

type UserProfileData = {
  id: string | number;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  status?: string | null;
};

type UserProfileTriggerProps = {
  userId?: string | number | null;
  preview?: Partial<UserProfileData>;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

export function UserProfileTrigger({
  userId,
  preview,
  className = "",
  disabled = false,
  children,
}: UserProfileTriggerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(
    preview?.id || preview?.name
      ? {
          id: preview?.id ?? userId ?? "",
          name: preview?.name ?? "User",
          email: preview?.email ?? null,
          avatar_url: preview?.avatar_url ?? null,
          status: preview?.status ?? null,
        }
      : null
  );

  useEffect(() => {
    if (!preview?.id && !preview?.name && !userId) return;
    setProfile((prev) => ({
      id: preview?.id ?? userId ?? prev?.id ?? "",
      name: preview?.name ?? prev?.name ?? "User",
      email: preview?.email ?? prev?.email ?? null,
      avatar_url: preview?.avatar_url ?? prev?.avatar_url ?? null,
      status: preview?.status ?? prev?.status ?? null,
    }));
  }, [preview?.id, preview?.name, preview?.email, preview?.avatar_url, preview?.status, userId]);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;
    setLoading(true);

    api
      .get(`/users/${userId}`)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load user profile:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const statusText = useMemo(() => {
    if (!profile?.status || !String(profile.status).trim()) return "No status set";
    return String(profile.status).trim();
  }, [profile?.status]);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || !userId}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <UserAvatar
              name={profile?.name ?? "User"}
              avatarUrl={profile?.avatar_url ?? null}
              size="lg"
              rounded="full"
              className="h-40 w-40 text-2xl"
            />
            <DialogTitle className="text-xl">{profile?.name ?? "User"}</DialogTitle>
            
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sidebar">
                  Full Name
                </p>
                <p className="text-sm font-medium text-foreground">{profile?.name ?? "Unknown"}</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="text-sm font-medium text-foreground">{profile?.email ?? "Not available"}</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Status
                </div>
                <p className="text-sm font-medium text-foreground">{statusText}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
