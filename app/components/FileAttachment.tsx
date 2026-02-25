"use client";

import { useState } from "react";
import {
  Download, Share2, Eye, Film, Music,
  FileText, FileArchive, FileCode, FileSpreadsheet, File as FileIcon2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttachmentFile = {
  id?: number | string;
  url: string;
  name: string;
  type: string;          // MIME type e.g. "image/png", "application/pdf"
  size?: number;
  path?: string;
  // Extended fields used in the Files tab view
  message_id?: number;
  sender?: { id: number; name: string; avatar_url?: string };
  created_at?: string;
};

type FileAttachmentProps = {
  file: AttachmentFile;
  onDownload?: (file: AttachmentFile) => void;
  onShare?: (file: AttachmentFile) => void;
  /** Disable hover actions (e.g. for read-only parent message previews) */
  readOnly?: boolean;
};

type FileAttachmentListProps = {
  files: AttachmentFile[];
  onDownload?: (file: AttachmentFile) => void;
  onShare?: (file: AttachmentFile) => void;
  readOnly?: boolean;
  /**
   * When true, renders the rich tab layout:
   *  - images/videos → square grid with hover overlay + lightbox
   *  - other files   → coloured row cards with type badges, sender, date
   * When false (default), renders the compact inline chat layout.
   */
  tabView?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isImage(type: string) { return type.startsWith("image/"); }
function isVideo(type: string) { return type.startsWith("video/"); }
function isAudio(type: string) { return type.startsWith("audio/"); }

type FileKind = "image" | "video" | "audio" | "pdf" | "archive" | "code" | "sheet" | "doc" | "other";

function getKind(file: AttachmentFile): FileKind {
  const { type, name = "" } = file;
  if (isImage(type)) return "image";
  if (isVideo(type)) return "video";
  if (isAudio(type)) return "audio";
  if (type === "application/pdf") return "pdf";
  if (type.includes("zip") || type.includes("tar") || type.includes("compressed") || type.includes("archive")) return "archive";
  if (type.includes("javascript") || type.includes("typescript") || type.includes("json") || type.includes("html") || type.includes("css") || type.includes("xml")) return "code";
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return "sheet";
  if (type.includes("word") || type.includes("document") || type.startsWith("text/")) return "doc";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg","avif"].includes(ext)) return "image";
  if (["mp4","mov","webm","avi"].includes(ext)) return "video";
  if (["mp3","wav","ogg","flac"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (["zip","rar","tar","gz","7z"].includes(ext)) return "archive";
  if (["js","ts","jsx","tsx","py","html","css","json","xml","sh"].includes(ext)) return "code";
  if (["xls","xlsx","csv"].includes(ext)) return "sheet";
  if (["doc","docx","txt","md"].includes(ext)) return "doc";
  return "other";
}

const KIND_META: Record<FileKind, {
  icon: React.ElementType; bg: string; text: string; label: string; border: string;
}> = {
  image:   { icon: Eye,             bg: "bg-violet-100 dark:bg-violet-900/40",   text: "text-violet-600 dark:text-violet-300",   label: "Image",    border: "border-violet-200 dark:border-violet-700" },
  video:   { icon: Film,            bg: "bg-rose-100 dark:bg-rose-900/40",       text: "text-rose-600 dark:text-rose-300",       label: "Video",    border: "border-rose-200 dark:border-rose-700" },
  audio:   { icon: Music,           bg: "bg-amber-100 dark:bg-amber-900/40",     text: "text-amber-600 dark:text-amber-300",     label: "Audio",    border: "border-amber-200 dark:border-amber-700" },
  pdf:     { icon: FileText,        bg: "bg-red-100 dark:bg-red-900/40",         text: "text-red-600 dark:text-red-300",         label: "PDF",      border: "border-red-200 dark:border-red-700" },
  archive: { icon: FileArchive,     bg: "bg-orange-100 dark:bg-orange-900/40",   text: "text-orange-600 dark:text-orange-300",   label: "Archive",  border: "border-orange-200 dark:border-orange-700" },
  code:    { icon: FileCode,        bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-300", label: "Code",     border: "border-emerald-200 dark:border-emerald-700" },
  sheet:   { icon: FileSpreadsheet, bg: "bg-green-100 dark:bg-green-900/40",     text: "text-green-600 dark:text-green-300",     label: "Sheet",    border: "border-green-200 dark:border-green-700" },
  doc:     { icon: FileText,        bg: "bg-blue-100 dark:bg-blue-900/40",       text: "text-blue-600 dark:text-blue-300",       label: "Document", border: "border-blue-200 dark:border-blue-700" },
  other:   { icon: FileIcon2,       bg: "bg-gray-100 dark:bg-gray-800",          text: "text-gray-500 dark:text-gray-400",       label: "File",     border: "border-gray-200 dark:border-gray-700" },
};

// ─── Shared tiny icon button ──────────────────────────────────────────────────

function ActionBtn({
  icon, label, onClick, variant = "overlay",
}: {
  icon: React.ReactNode; label: string; onClick: () => void;
  variant?: "overlay" | "compact";
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={
        variant === "compact"
          ? "w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          : "w-6 h-6 rounded-md flex items-center justify-center bg-black/30 hover:bg-black/50 text-white transition-colors"
      }
    >
      {icon}
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl" />
        <p className="mt-3 text-sm text-white/70 truncate max-w-[60vw]">{name}</p>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg leading-none transition-colors"
          aria-label="Close preview"
        >×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE CHAT VARIANTS (compact, shown inside message bubbles)
// ─────────────────────────────────────────────────────────────────────────────

function InlineImageAttachment({ file, onDownload, onShare, readOnly }: FileAttachmentProps) {
  const [hovered, setHovered] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div
        className="relative inline-block rounded-lg overflow-hidden group max-w-[280px] max-h-[200px] cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.name}
          className="block max-w-[280px] max-h-[200px] w-auto h-auto object-cover rounded-lg"
          draggable={false}
        />
        {!readOnly && hovered && (
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-2 transition-opacity duration-150">
            <div className="flex justify-end gap-1.5">
              <ActionBtn icon={<Eye size={13} />} label="Preview" onClick={() => setLightboxOpen(true)} />
              <ActionBtn icon={<Download size={13} />} label="Download" onClick={() => onDownload?.(file)} />
              {onShare && <ActionBtn icon={<Share2 size={13} />} label="Share" onClick={() => onShare(file)} />}
            </div>
            <p className="text-white text-[11px] font-medium truncate drop-shadow-sm">{file.name}</p>
          </div>
        )}
      </div>
      {lightboxOpen && <Lightbox url={file.url} name={file.name} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

function InlineGenericAttachment({ file, onDownload, onShare, readOnly }: FileAttachmentProps) {
  const [hovered, setHovered] = useState(false);
  const kind = getKind(file);
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <div
      className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 max-w-[280px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`shrink-0 w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
        <Icon size={16} className={meta.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">{file.name}</p>
        {file.size != null && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatBytes(file.size)}</p>
        )}
      </div>
      {!readOnly && hovered && (
        <div className="flex items-center gap-1 shrink-0">
          <ActionBtn icon={<Download size={12} />} label="Download" onClick={() => onDownload?.(file)} variant="compact" />
          {onShare && <ActionBtn icon={<Share2 size={12} />} label="Share" onClick={() => onShare(file)} variant="compact" />}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB VIEW VARIANTS (richer, for the Files tab page)
// ─────────────────────────────────────────────────────────────────────────────

function TabMediaCard({ file, onDownload, onShare, readOnly }: FileAttachmentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isVid = isVideo(file.type);

  return (
    <>
      <div className="relative group/media rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 aspect-square cursor-pointer">
        {isVid ? (
          <>
            <video src={file.url} className="w-full h-full object-cover opacity-70" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Film size={18} className="text-white ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/50 transition-all duration-200 flex flex-col justify-between p-2">
          {!readOnly && (
            <div className="flex justify-end gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity duration-200">
              {!isVid && (
                <ActionBtn icon={<Eye size={13} />} label="Preview" onClick={() => setLightboxOpen(true)} />
              )}
              <ActionBtn icon={<Download size={13} />} label="Download" onClick={() => onDownload?.(file)} />
              {onShare && <ActionBtn icon={<Share2 size={13} />} label="Forward" onClick={() => onShare(file)} />}
            </div>
          )}
          <div className="opacity-0 group-hover/media:opacity-100 transition-opacity duration-200">
            <p className="text-white text-[11px] font-semibold truncate leading-tight drop-shadow">{file.name}</p>
            <p className="text-white/60 text-[10px] truncate mt-0.5">
              {[file.sender?.name, formatDate(file.created_at)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>
      {lightboxOpen && <Lightbox url={file.url} name={file.name} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

function TabFileRow({ file, onDownload, onShare, readOnly }: FileAttachmentProps) {
  const kind = getKind(file);
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <div className={`relative group/fileRow flex items-center gap-3 px-4 py-3 rounded-xl border ${meta.border} bg-white dark:bg-zinc-900 hover:shadow-md dark:hover:shadow-black/30 transition-all duration-150`}>
      <div className={`shrink-0 w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center`}>
        <Icon size={18} className={meta.text} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{file.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
          {file.size != null && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatBytes(file.size)}</span>
          )}
          {file.sender?.name && (
            <>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{file.sender.name}</span>
            </>
          )}
          {file.created_at && (
            <>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDate(file.created_at)}</span>
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/fileRow:opacity-100 transition-opacity duration-150">
          <ActionBtn icon={<Download size={14} />} label="Download" onClick={() => onDownload?.(file)} variant="compact" />
          {onShare && <ActionBtn icon={<Share2 size={14} />} label="Forward" onClick={() => onShare(file)} variant="compact" />}
        </div>
      )}
    </div>
  );
}

// ─── Section header (tab view only) ──────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-1 mb-2">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500">
        {count}
      </span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
    </div>
  );
}

// ─── Single file dispatcher (public export) ───────────────────────────────────

export function FileAttachment({ file, onDownload, onShare, readOnly }: FileAttachmentProps) {
  if (isImage(file.type)) {
    return <InlineImageAttachment file={file} onDownload={onDownload} onShare={onShare} readOnly={readOnly} />;
  }
  return <InlineGenericAttachment file={file} onDownload={onDownload} onShare={onShare} readOnly={readOnly} />;
}

// ─── Multi-file list (main public export) ────────────────────────────────────

export function FileAttachmentList({
  files,
  onDownload,
  onShare,
  readOnly,
  tabView = false,
}: FileAttachmentListProps) {
  if (!files.length) return null;

  // ── Tab view ─────────────────────────────────────────────────────────────────
  if (tabView) {
    const mediaFiles   = files.filter((f) => { const k = getKind(f); return k === "image" || k === "video"; });
    const genericFiles = files.filter((f) => { const k = getKind(f); return k !== "image" && k !== "video"; });

    return (
      <div className="space-y-8">
        {mediaFiles.length > 0 && (
          <section>
            <SectionHeader label="Photos & Videos" count={mediaFiles.length} />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {mediaFiles.map((file, i) => (
                <TabMediaCard
                  key={file.id ?? file.message_id ?? i}
                  file={file}
                  onDownload={onDownload}
                  onShare={onShare}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </section>
        )}
        {genericFiles.length > 0 && (
          <section>
            <SectionHeader label="Files & Documents" count={genericFiles.length} />
            <div className="space-y-2">
              {genericFiles.map((file, i) => (
                <TabFileRow
                  key={file.id ?? file.message_id ?? i}
                  file={file}
                  onDownload={onDownload}
                  onShare={onShare}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── Inline chat view (default) ───────────────────────────────────────────────
  const images = files.filter((f) => isImage(f.type));
  const others  = files.filter((f) => !isImage(f.type));

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {images.length > 0 && (
        <div className={images.length === 1 ? "flex" : "grid grid-cols-2 gap-1.5"}>
          {images.map((file, i) => (
            <InlineImageAttachment
              key={file.id ?? i}
              file={file}
              onDownload={onDownload}
              onShare={onShare}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      {others.map((file, i) => (
        <InlineGenericAttachment
          key={file.id ?? i}
          file={file}
          onDownload={onDownload}
          onShare={onShare}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}