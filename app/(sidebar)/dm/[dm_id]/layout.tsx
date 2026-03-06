"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MainHeader from "@/app/shared/ui/MainHeader";
import api from "@/lib/axios";

type Channel = {
  id: number;
  is_private: boolean;
  is_dm?: boolean;
};

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const channelId = params.dm_id as string;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [dmUser, setDmUser] = useState<any>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    if (!channelId) return;

    setLayoutReady(false); // reset when channel changes

    api.get(`/channels/${channelId}`).then((res) => {
      const data = res.data;
      setChannel(data.channel);

      if (data.channel?.is_dm) {
        setIsDm(true);
        setDmUser(data.dm_user);
      } else {
        setIsDm(false);
        setDmUser(null);
      }
    }).finally(() => {
      setLayoutReady(true);
    });
  }, [channelId]);

  return (
    <div className="flex flex-col h-full dm_container">
      {layoutReady && (
        <MainHeader
          id={channelId}
          type={isDm ? "dm" : "channel"}
          dmUser={dmUser}
          isPrivate={channel?.is_private ?? false}
        />
      )}

      {/* Page content (messages / files / pins) */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
