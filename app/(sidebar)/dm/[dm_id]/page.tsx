"use client";
import { useParams } from "next/navigation";
import ChannelChat from "@/app/(sidebar)/channel/[channel_id]/ChannelChat";

export default function DMPage() {
  const params = useParams();
  const dmId = params.dm_id as string;

  if (!dmId) return null;

  return <ChannelChat channelId={dmId} />;
}
