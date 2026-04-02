"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Headphones,
  History,
  Radio,
} from "lucide-react";
import { useHuddleCalls, type HuddleCallListItem } from "@/hooks/useHuddleCalls";
import { formatRelativeTime } from "@/lib/utils";

function CallCard({ call }: { call: HuddleCallListItem }) {
  const startedLabel = formatRelativeTime(call.startedAt ?? call.lastJoinedAt);
  const endedLabel = formatRelativeTime(call.lastLeftAt);

  return (
    <Link
      href={call.href}
      className="group block rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar)]/70 p-4 transition hover:border-[var(--sidebar-ring)] hover:bg-[var(--accent)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                call.isOngoing
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-[var(--accent)] text-[var(--muted-foreground)]"
              }`}
            >
              {call.isOngoing ? <Radio className="h-3 w-3" /> : <History className="h-3 w-3" />}
              {call.isOngoing ? "Live" : "Previous"}
            </span>
            {call.channelId && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {call.isDm ? "DM huddle" : "Channel huddle"}
              </span>
            )}
          </div>
          <h3 className="mt-3 truncate text-base font-semibold text-[var(--sidebar-foreground)]">
            {call.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {call.isOngoing
              ? startedLabel
                ? `Started ${startedLabel}`
                : "Huddle is live now"
              : endedLabel
              ? `Ended ${endedLabel}`
              : call.lastJoinedAt
              ? `Joined ${formatRelativeTime(call.lastJoinedAt)}`
              : "Recent huddle"}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--sidebar-foreground)] transition group-hover:border-[var(--sidebar-ring)] group-hover:text-[var(--sidebar-ring)]">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Headphones;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--sidebar)]/40 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--muted-foreground)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--sidebar-foreground)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

export default function CallsPage() {
  const { loading, ongoingCalls, recentCalls } = useHuddleCalls();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--sidebar)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                Calls
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--sidebar-foreground)]">
                Ongoing and previous huddles
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
                Ongoing calls come from the current active channel and DM huddles. Previous calls are the huddles you joined recently on this device.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3">
                <p className="text-[var(--muted-foreground)]">Live now</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--sidebar-foreground)]">
                  {ongoingCalls.length}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3">
                <p className="text-[var(--muted-foreground)]">Previous</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--sidebar-foreground)]">
                  {recentCalls.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500" />
            <h2 className="text-lg font-semibold text-[var(--sidebar-foreground)]">
              Ongoing calls
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar)]/40"
                />
              ))}
            </div>
          ) : ongoingCalls.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ongoingCalls.map((call) => (
                <CallCard key={`ongoing-${call.roomId}`} call={call} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Radio}
              title="No ongoing huddles"
              description="When a channel or DM huddle is live, it will appear here so you can jump back in."
            />
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h2 className="text-lg font-semibold text-[var(--sidebar-foreground)]">
              Previous calls
            </h2>
          </div>

          {recentCalls.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentCalls.map((call) => (
                <CallCard key={`recent-${call.roomId}`} call={call} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Headphones}
              title="No previous huddles yet"
              description="Calls you join from channels or invite links will show up here after you enter them."
            />
          )}
        </section>
      </div>
    </div>
  );
}
