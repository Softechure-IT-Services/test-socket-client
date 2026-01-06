"use client";

import { useAuth } from "@/components/context/userId_and_connection/provider";
import { UserType } from "@/components/context/userId_and_connection/provider";
import ButtonGroup from "@/components/ui/button-group";
import { use, useEffect, useState } from "react";
import Link from "next/link";

interface MainHeaderProps {
  id: string; // channelId or dmId
  type?: "channel" | "dm";
  token?: string;
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

export default function MainHeader({ id, type, token }: MainHeaderProps) {
  const { user } = useAuth();
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
    <>
        <h2 className="mb-1 font-semibold">
          {loading
            ? "Loading..."
            : type === "channel"
            ? `# ${channel?.name}`  
            : "Direct Message"}
        </h2>

        {type === "channel" && !loading && (
          <p className="text-xs text-gray-500" >
            {members.length} members
          </p>
        )}

        <ButtonGroup items={buttons} />
   
      {/* <Link href={`http://localhost:5000/huddle?key=${token}`} className="">Huddle</Link> */}
      <Link href={`http://localhost:3000/huddle?channel_id=${channel?.id}&user_id=${user?.id}`} target="_blank" className="rounded bg-red-500 text-white px-4 flex items-center justify-center">Huddle</Link>


      {/* <p>{randomId ? "generated" : "no"}</p> */}
    </>
  );
}
