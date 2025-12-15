"use client";
import { useAuth } from "@/components/context/userId_and_connection/provider";
import ButtonGroup from "@/components/ui/button-group";

export default function MainHeader() {
  
  const { userId, isOnline } = useAuth();
  const buttons = [
    { label: "Message", href: "/" },
    { label: "Files", href: "/tabs/files",},
    { label: "Pins", href: "/tabs/pins" },
  ];





  return (
    <div className="p-4 border-b flex justify-between sticky top-[55px] z-50 bg-white">
      <div>
      <h2 className="mb-3">{userId ?? "Guest"}</h2>
       <ButtonGroup items={buttons} />
      </div>
      <span>{isOnline ? "connected" : " connecting..."}</span>
    </div>
  );
}
