// FileTab.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DocumentItem from "@/app/components/ui/documentItem";
import FileHover from "@/app/components/file-hover"; // make sure path is correct
import axios from "@/lib/axios";

interface File {
  message_id: number;
  file: string;
  created_at: string;
  sender: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  name?: string;
}

export default function FileTab() {
  const params = useParams();
  const channelId = params?.channel_id;

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    const fetchFiles = async () => {
      try {
        const res = await axios.get(`/channels/${channelId}/files`);
        if (res.data.success) {
          setFiles(res.data.data.files);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [channelId]);

const handleAction = async (
  action: "download" | "share",
  fileId: string
) => {
  if (action === "download") {
    try {
      const res = await axios.get(
        `/channels/messages/${fileId}/download`,
        { responseType: "blob" } // 🔑 IMPORTANT
      );

      // Create download link
     const disposition = res.headers["content-disposition"];
    const fileName =
      disposition?.split("filename=")[1]?.replace(/"/g, "") || "file";

    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  if (action === "share") {
    console.log("Share clicked", fileId);
  }
};


  if (loading) return <p className="p-6">Loading files...</p>;
  if (files.length === 0) return <p className="p-6">No files found.</p>;

  return (
    <div className="w-full mx-auto p-6">
      <div className="rounded-md border border-gray-300">
        {files.map((f, index) => (
          <div
            key={index}
            className="relative group/fileGroup" // <-- make this relative to position hover absolutely
          >
            <DocumentItem
              name={f.name ?? "unnamed file"}
              sharedBy={f.sender.name}
              date={new Date(f.created_at).toLocaleDateString()}
            />

            {/* Show FileHover only on hover */}
            <div className="opacity-0 group-hover/fileGroup:opacity-100 transition-opacity duration-200">
              <FileHover fileId={f.message_id.toString()} onAction={handleAction} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
