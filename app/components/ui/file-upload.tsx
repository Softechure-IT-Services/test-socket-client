"use client";

import { useEffect, useState } from "react";
import { CiViewList, CiTextAlignJustify } from "react-icons/ci";
import { FaFileAlt } from "react-icons/fa";
import { GoWorkflow } from "react-icons/go";
import { FaComputer } from "react-icons/fa6";

export default function FileUploadToggle() {
  const [open, setOpen] = useState<boolean>(false);

 useEffect(() => {
  const toggleHandler = () => setOpen(prev => !prev);
  const closeHandler = () => setOpen(false);

  window.addEventListener("toggleFileUpload", toggleHandler);
  window.addEventListener("closeFileUpload", closeHandler);

  return () => {
    window.removeEventListener("toggleFileUpload", toggleHandler);
    window.removeEventListener("closeFileUpload", closeHandler);
  };
}, []);


  if (!open) return null;

  return (
    <div className="absolute bottom-15 left-1 z-50 rounded-xl text-gray-500 py-1 px-3 bg-white">
      <div className="border border-gray-200 shadow-md py-3 px-7 w-90 rounded-lg gap-3">
        <p className="flex col-flex text-black text-md items-center gap-3 mt-2">
          <CiViewList size={20} />
          <span className="text-md">List</span>
        </p>

        <p className="flex col-flex text-black text-md items-center gap-3 mt-2">
          <FaFileAlt size={20} />
          <span className="text-md">Recent file</span>
        </p>

        <p className="flex col-flex text-black text-md items-center gap-3 mt-2">
          <CiTextAlignJustify size={20} />
          <span className="text-md">Text snippet</span>
        </p>

        <p className="flex col-flex text-black text-md items-center gap-3 mt-2">
          <GoWorkflow size={20} />
          <span className="text-md">Workflow</span>
        </p>

        {/* ✅ THIS IS THE ONLY FUNCTIONAL LINE */}
        <p
          onClick={() => {
            const input = document.getElementById(
              "file-upload"
            ) as HTMLInputElement | null;

            input?.click();
          }}
          className="flex col-flex text-black text-md items-center gap-3 mt-2 cursor-pointer"
        >
          <FaComputer size={20} />
          <span className="text-md">Upload from computer</span>
        </p>
      </div>
    </div>
  );
}
