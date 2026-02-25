// FileTab.tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { File as FileIcon2 } from "lucide-react";
import { FileAttachmentList, type AttachmentFile } from "@/app/components/FileAttachment";
import CreateNew from "@/app/components/modals/CreateNew";
import axios from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem {
  message_id: number;
  file: string;       // URL from API
  url?: string;       // may also be present
  created_at: string;
  sender: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  name?: string;
  type?: string;
  size?: number;
}

const PAGE_SIZE = 30;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="space-y-8 p-5">
      <div>
        <div className="h-4 w-32 bg-gray-100 dark:bg-zinc-800 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-4 w-24 bg-gray-100 dark:bg-zinc-800 rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Map API response → AttachmentFile ────────────────────────────────────────

function toAttachmentFile(f: FileItem): AttachmentFile {
  return {
    id:         f.message_id,
    message_id: f.message_id,
    url:        f.url ?? f.file,
    name:       f.name ?? "unnamed file",
    type:       f.type ?? "",
    size:       f.size,
    sender:     f.sender,
    created_at: f.created_at,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FileTab() {
  const params = useParams();
  const channelId = params?.channel_id;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);

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
          const incoming: FileItem[] = res.data.data.files;
          setFiles((prev) => (pageNum === 1 ? incoming : [...prev, ...incoming]));
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

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchFiles(1);
  }, [channelId, fetchFiles]);

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
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchFiles]);

  // ── Action handlers — identical pattern to ChannelChat ───────────────────────

  const handleDownload = async (file: AttachmentFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // onShare receives the full file object from FileAttachmentList.
  // We open the forward modal using the message_id stored on the file.
  const handleShare = (file: AttachmentFile) => {
    if (file.message_id != null) {
      setForwardMessageId(String(file.message_id));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <SkeletonGrid />;

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <FileIcon2 size={28} className="text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No files yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Files shared in this channel will appear here
        </p>
      </div>
    );
  }

  const attachments = files.map(toAttachmentFile);

  return (
    <div className="w-full p-5">
      <FileAttachmentList
        files={attachments}
        onDownload={handleDownload}
        onShare={handleShare}
        tabView
      />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1 mt-4" />

      {/* Loading more spinner */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {!hasMore && files.length > 0 && (
        <p className="text-center text-xs text-gray-300 dark:text-zinc-600 py-4">
          All files loaded
        </p>
      )}

      {/* Forward modal — same as ChannelChat */}
      <CreateNew
        open={!!forwardMessageId}
        onClose={() => setForwardMessageId(null)}
        type="forward"
        forwardMessageId={forwardMessageId}
      />
    </div>
  );
}