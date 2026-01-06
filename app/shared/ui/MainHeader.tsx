"use client";

import { useAuth } from "@/components/context/userId_and_connection/provider";
import ButtonGroup from "@/components/ui/button-group";
import TabsModalDemo from "@/components/ui/groupmember";
import { useEffect, useState } from "react";
import { FaHeadphones } from "react-icons/fa6"
import { FaRegBell } from "react-icons/fa";
import { IoSearchOutline } from "react-icons/io5";


interface MainHeaderProps {
  id?: string; // channelId or dmId
  type?: "channel" | "dm";
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
}

export default function MainHeader({ id, type }: MainHeaderProps) {
  const { isOnline } = useAuth();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const buttons = [
    { label: "Message", href: "/" },
    { label: "Files", href: "/tabs/files" },
    { label: "Pins", href: "/tabs/pins" },
  ];

  useEffect(() => {
    if (!id || type !== "channel") return;

    const fetchChannelDetails = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/channels/${id}`,
          {
            credentials: "include", // important if you use cookies
          }
        );

        if (!res.ok) throw new Error("Failed to fetch channel");

        const data = await res.json();
        setChannel(data.channel);
        setMembers(data.members);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelDetails();
  }, [id, type]);

  return (
    <div className="px-4 pt-4 pb-0 border-b flex justify-between sticky top-[55px] z-50 bg-white">
      <div>
        <h2 className="mb-1 text-2xl font-semibold">
          {loading
            ? "Loading..."
            : type === "channel"
            ? `# ${channel?.name}`
            : "Direct Message"}
        </h2>

        {/* {type === "channel" && !loading && (
          <p className="text-xs text-gray-500">
            {members.length} members
          </p>
        )} */}

        <ButtonGroup items={buttons} />
      </div>

      <div className="flex flex-row justify-center items-start gap-3 text-sm text-gray-600">
        {type === "channel" && channel && (
          <TabsModalDemo channelId={channel.id} />
        //  <div>hwllo</div>
        )}
        <div className="rounded-lg bg-gray-100 p-2 border border-gray-200">
            <FaHeadphones size={18}/>
        </div>
        <div className="rounded-lg bg-gray-100 p-2 border border-gray-200">
            <FaRegBell size={18}/>
        </div>
        <button className="rounded-lg bg-gray-100 p-2 border border-gray-200">
          <IoSearchOutline size={18}/>
        </button>
        {isOnline ? "" : ""}
      </div>
    </div>
  );
}
