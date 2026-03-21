"use client";

import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  // Same pattern as the channel layout — measure the header so ChannelChat's
  // max-h calc (which depends on --main-header-height) is always correct.
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelId) return;

    setLayoutReady(false);

    api
      .get(`/channels/${channelId}`)
      .then((res) => {
        const data = res.data;
        setChannel(data.channel);

        if (data.channel?.is_dm) {
          setIsDm(true);
          setDmUser(data.dm_user);
        } else {
          setIsDm(false);
          setDmUser(null);
        }
      })
      .finally(() => {
        setLayoutReady(true);
      });
  }, [channelId]);

  // Update --main-header-height whenever the header renders or resizes.
  // Without this the variable is 0/undefined and ChannelChat overflows.
  useLayoutEffect(() => {
    if (!layoutReady || !headerRef.current) return;

    const updateHeight = () => {
      const height = headerRef.current!.offsetHeight;
      document.documentElement.style.setProperty(
        "--main-header-height",
        `${height}px`
      );
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(headerRef.current);

    return () => ro.disconnect();
  }, [layoutReady, isDm, dmUser]);

  return (
    <div className="flex flex-col h-full dm_container">
      {layoutReady && (
        <div ref={headerRef} className="sticky top-0 z-1">
          <MainHeader
            id={channelId}
            type={isDm ? "dm" : "channel"}
            dmUser={dmUser}
            isPrivate={channel?.is_private ?? false}
          />
        </div>
      )}

      {/* Page content (messages / files / pins) */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}