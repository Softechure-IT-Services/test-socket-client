"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Member = {
  id: number;
  username: string;
  email: string;
};

type ChannelMembersProps = {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName?: string; 
};

export default function Channelmambers({
  isOpen,
  onClose,
  channelId,
  channelName = "Channel",
}: ChannelMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !channelId) return;

    setLoading(true);

    fetch(`/api/channels/${channelId}/members`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((data) => setMembers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [channelId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md text-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-2xl font-bold"># {channelName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3">
            Members ({members.length})
          </h3>

          {loading ? (
            <p className="text-gray-500">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-gray-500">No members found.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  {/* Avatar */}
                  <Image
                    src="/1.jpg" // placeholder avatar, replace with member.avatar if available
                    alt={member.username}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />

                  <span className="capitalize font-medium">{member.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
