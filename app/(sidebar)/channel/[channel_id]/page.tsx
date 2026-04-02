"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ChannelChat from "./ChannelChat";

export default function ChannelPage() {
  
  const params = useParams();
  const channelId = params.channel_id as string;

  return (
    <Suspense fallback={null}>
      <ChannelChat channelId={channelId} />
    </Suspense>
  );
}
