"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { FaHeadphones } from "react-icons/fa6";
import { usePresence } from "./context/PresenceContext";

import api from "@/lib/axios";
import { UserAvatar } from "@/app/components/MessageMeta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { cn } from "@/lib/utils";

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

// ------------------------------------------------------------------
// Skeleton primitives
// ------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

function SkeletonField({
  icon,
  label,
  valueWidth = "w-40",
}: {
  icon?: React.ReactNode;
  label: string;
  valueWidth?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar">
        {icon}
        {label}
      </div>
      <Skeleton className={cn("h-4", valueWidth)} />
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

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
  }, [
    preview?.id,
    preview?.name,
    preview?.email,
    preview?.avatar_url,
    preview?.status,
    userId,
  ]);

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

  const { isHuddling } = usePresence();
  const huddleActive = userId ? isHuddling(userId) : false;

  const statusText = useMemo(() => {
    if (huddleActive) return "In a Huddle";
    if (!profile?.status || !String(profile.status).trim()) return "No status set";
    return String(profile.status).trim();
  }, [profile?.status, huddleActive]);

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
            {/* Avatar — shimmer while loading and no cached avatar */}
            {loading && !profile?.avatar_url ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <UserAvatar
                name={profile?.name ?? "User"}
                avatarUrl={profile?.avatar_url ?? null}
                userId={userId}
                size="lg"
                rounded="full"
                className="h-40 w-40 text-2xl"
              />
            )}

            {/* Name title */}
            {loading && !profile?.name ? (
              <Skeleton className="mx-auto mt-2 h-6 w-32" />
            ) : (
              <DialogTitle className="text-xl">
                {profile?.name ?? "User"}
              </DialogTitle>
            )}
          </DialogHeader>

          <div className="space-y-3">
            {/* Full Name */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sidebar">
                Full Name
              </p>
              {loading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile?.name ?? "Unknown"}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile?.email ?? "Not available"}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar">
                {huddleActive ? (
                  <FaHeadphones className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                Status
              </div>
              {loading ? (
                <Skeleton className="h-4 w-56" />
              ) : (
                <p className={cn(
                  "text-sm font-medium",
                  huddleActive ? "text-indigo-400 font-semibold" : "text-foreground"
                )}>
                  {statusText}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}