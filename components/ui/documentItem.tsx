"use client";

import { FaFileAlt } from "react-icons/fa";

type Props = {
  name: string;
  sharedBy: string;
  date: string;
};

export default function DocumentItem({ name, sharedBy, date }: Props) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-300">
      <div className="p-2 rounded-lg flex items-center justify-center">
        <FaFileAlt size={30}/>
      </div>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-gray-500">
          Shared by {sharedBy} on {date}
        </p>
      </div>
    </div>
  );
}
