"use client";

import { useParams } from "next/navigation";
import ChannelChat from "./ChannelChat";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channel_id as string;

  return <ChannelChat channelId={channelId} />;
}
