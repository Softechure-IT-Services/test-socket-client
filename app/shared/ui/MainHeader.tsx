
import { cookies } from "next/headers";
import MainHeaderClient from "./MainHeaderClient";

interface MainHeaderProps {
  id: string; // channelId or dmId
  type?: "channel" | "dm";
}


export default async function MainHeader({ id, type }: MainHeaderProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || "";
  
  return (
    <div className="p-4 border-b flex justify-between sticky top-[55px] z-50 bg-white">
      <MainHeaderClient id={id} type={type} token={token} />        
    </div>
  );
}