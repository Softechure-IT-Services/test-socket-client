// FileTab.tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import DocumentItem from "@/app/components/ui/documentItem";
import FileHover from "@/app/components/file-hover";
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

const PAGE_SIZE = 20;

export default function FileTab() {
  const params = useParams();
  const channelId = params?.channel_id;

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchFiles = useCallback(
    async (pageNum: number) => {
      if (!channelId) return;
      try {
        const res = await axios.get(
          `/channels/${channelId}/files?page=${pageNum}&limit=${PAGE_SIZE}`
        );
        if (res.data.success) {
          const incoming: File[] = res.data.data.files;
          setFiles((prev) =>
            pageNum === 1 ? incoming : [...prev, ...incoming]
          );
          setHasMore(incoming.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [channelId]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchFiles(1);
  }, [channelId, fetchFiles]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          setPage((prev) => {
            const next = prev + 1;
            fetchFiles(next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchFiles]);

  const handleAction = async (
    action: "download" | "share",
    fileId: string
  ) => {
    if (action === "download") {
      try {
        const res = await axios.get(
          `/channels/messages/${fileId}/download`,
          { responseType: "blob" }
        );

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

  if (loading) {
    return (
      <div className="w-full mx-auto p-6 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-md bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0)
    return <p className="p-6 text-gray-500">No files found.</p>;

  return (
    <div className="w-full mx-auto p-6">
      <div className="rounded-md border border-gray-300 divide-y divide-gray-200">
        {files.map((f, index) => (
          <div
            key={`${f.message_id}-${index}`}
            className="relative group/fileGroup"
          >
            <DocumentItem
              name={f.name ?? "unnamed file"}
              sharedBy={f.sender.name}
              date={new Date(f.created_at).toLocaleDateString()}
            />

            {/* FileHover visible on row hover */}
            <div className="opacity-0 group-hover/fileGroup:opacity-100 transition-opacity duration-200">
              <FileHover
                fileId={f.message_id.toString()}
                onAction={handleAction}
              />
            </div>
          </div>
        ))}

        {/* Sentinel element for IntersectionObserver */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!hasMore && files.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">
          All files loaded
        </p>
      )}
    </div>
  );
}