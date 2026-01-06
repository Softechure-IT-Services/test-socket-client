"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Channelmambers from "./channelmambertab";

interface AvatarDemoProps {
  channelId: string; // add this prop
}

export default function AvatarDemo({ channelId }: AvatarDemoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Sample members
  const members = [
    { name: "Sagar", src: "images/file-img.png" },
    { name: "Rahul", src: "images/home-chair.png" },
    { name: "Amit", src: "images/logo.png" },
  ];

  const handleAvatarClick = (name: string) => {
    setSelectedMember(name);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Avatars */}
      <div className="flex flex-row flex-wrap items-center gap-4">
        <div className="flex -space-x-4 px-2 py-1 border border-gray-100 rounded-lg">
          
          {members.map((member, idx) => (
            
            <Avatar
              key={idx}
              className="ring-1 ring-white cursor-pointer"
              onClick={() => handleAvatarClick(member.name)}
            >

              <AvatarImage src={member.src} alt={member.name} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedMember && (
        <>
        <div>helkl</div>
        <Channelmambers
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        
          channelId={channelId} // pass channelId here
        />
        </> 
      )}
    </>
  );
}
