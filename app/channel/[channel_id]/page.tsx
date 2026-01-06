import ChannelChat from "./ChannelChat";
import MainHeader from "@/app/shared/ui/MainHeader";

interface PageProps {
  params: Promise<{
    channel_id: string;
  }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { channel_id } = await params;

  return (
    <>
      <MainHeader id={channel_id} type="channel" />
      <ChannelChat channelId={channel_id} />
    </>
  );
}
