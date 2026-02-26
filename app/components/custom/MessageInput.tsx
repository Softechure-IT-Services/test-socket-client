
// MessageInput.tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { EditorContent, useEditor, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import CharacterCount from "@tiptap/extension-character-count";
import { Button } from "@/app/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import Picker from "@emoji-mart/react";
import { IoMdSend } from "react-icons/io";
import { CiFileOn } from "react-icons/ci";
import { FiUnderline, FiPlus } from "react-icons/fi";
import api from "@/lib/axios";
import { HiXMark } from "react-icons/hi2";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadedFile = {
  name: string;
  url: string;
  type: string;
  path: string;
  size: number;
};

type UploadingPreview = {
  uploading: true;
  id: string;
  name: string;
  preview: string; // blob URL — stable, created once per file
  progress: number;
};

type UploadedPreview = {
  uploading: false;
  name: string;
  url: string;
  type: string;
  path: string;
  size: number;
};

type PreviewFile = UploadingPreview | UploadedPreview;

// Allowed MIME types — extend as needed
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "text/plain",
];
const ALLOWED_LABEL = "JPEG, PNG, GIF, WEBP, SVG, MP4, WEBM, PDF, TXT";

const isAllowedType = (file: File) => ALLOWED_TYPES.includes(file.type);

const getFileKind = (type: string, name: string) => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || name.endsWith(".txt")) return "text";
  return "other";
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void;
  editingMessageId?: string | null;
  editingInitialContent?: string;
  onSaveEdit?: (messageId: string, content: string, files?: File[]) => void;
  onCancelEdit?: () => void;
  /** Files dropped from outside (e.g. drag-and-drop over the chat area). Processed through the normal upload pipeline. */
  dropFiles?: File[];
  /** Called after dropFiles have been picked up, so the parent can reset its state. */

  in_thread?: boolean; // Whether this MessageInput is rendered inside a ThreadPanel (affects styling)
  onDropFilesConsumed?: () => void;
}

// ─── Mention chip node ───────────────────────────────────────────────────────
// A custom inline Tiptap node that renders as a styled @Name pill in the editor.
// Serializes to <span data-mention data-user-id="X">@Name</span> in sent HTML —
// never shows raw HTML to the user, and carries the user ID for push notifications.
const MentionChip = Node.create({
  name: "mentionChip",
  group: "inline",
  inline: true,
  atom: true, // treated as a single unit (can't edit inside it)

  addAttributes() {
    return {
      userId: { default: null, parseHTML: (el) => el.getAttribute("data-user-id") },
      label:  { default: "",   parseHTML: (el) => el.textContent?.replace(/^@/, "") ?? "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention": "",
        "data-user-id": HTMLAttributes.userId,
        class: "mention-chip",
      }),
      `@${HTMLAttributes.label}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },
});

// ─── Deletable Image NodeView ─────────────────────────────────────────────────
// A React NodeView that wraps every image in the editor with a hover ✕ button.
// Works for both GIFs (inserted via setImage) and pasted/dropped images.

function DeletableImageView({ node, deleteNode }: any) {
  const [hovered, setHovered] = useState(false);
  const isGif = node.attrs.title === "via GIPHY";
  return (
    <NodeViewWrapper
      as="span"
      className="relative inline-flex flex-col align-bottom gap-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* File header — shown for GIFs from the picker */}
      {isGif && (
        <span className="flex items-center gap-1.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 text-xs text-gray-600 dark:text-gray-400 w-full">
          <span className="shrink-0 font-bold text-[10px] px-1 py-0.5 rounded bg-indigo-500 text-white leading-none">
            GIF
          </span>
          <span className="truncate opacity-70">{node.attrs.alt || "GIF"}</span>
          <span className="ml-auto shrink-0 opacity-50 text-[10px]">via GIPHY</span>
        </span>
      )}
      <span className="relative inline-block">
        <img
          src={node.attrs.src}
          alt={node.attrs.alt ?? ""}
          title={node.attrs.title ?? ""}
          className="max-h-48 rounded-md border border-gray-200"
          draggable={false}
        />
        {hovered && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // keep editor focus
              deleteNode();
            }}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 hover:bg-red-500 text-white text-[11px] leading-none shadow-md transition-colors z-10"
            title="Remove"
          >
            ✕
          </button>
        )}
      </span>
    </NodeViewWrapper>
  );
}

// Override the built-in Image extension to use our custom NodeView
const DeletableImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DeletableImageView);
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageInput({
  onSend,
  editingMessageId = null,
  editingInitialContent = "",
  onSaveEdit,
  onCancelEdit,
  dropFiles,
  in_thread = false,
  onDropFilesConsumed,
}: MessageInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifCategory, setGifCategory] = useState<string>("trending");
  const gifSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fileError, setFileError] = useState<string | null>(null);

  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);

  // uploading: files currently in-flight (have stable preview blob URL)
  const [uploading, setUploading] = useState<UploadingPreview[]>([]);
  // uploadedFiles: server-confirmed metadata
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.0.113:5000";

  // ─── GIF Search (GIPHY) ─────────────────────────────────────────────────────

  const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";

  const GIF_CATEGORIES = [
    { label: "🔥 Trending", value: "trending" },
    { label: "😂 Reactions", value: "reactions" },
    { label: "🎉 Celebrate", value: "celebrate" },
    { label: "😭 Sad", value: "sad" },
    { label: "💪 Hype", value: "hype" },
    { label: "🐱 Animals", value: "animals" },
  ];

  const fetchGifs = useCallback(
    async (query: string, category: string) => {
      if (!GIPHY_API_KEY) return;
      setGifLoading(true);
      try {
        const q = query.trim() || category;
        const endpoint =
          !query.trim() && category === "trending"
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`
            : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`;
        const res = await fetch(endpoint);
        const json = await res.json();
        setGifs(json.data ?? []);
      } catch {
        setGifs([]);
      } finally {
        setGifLoading(false);
      }
    },
    [GIPHY_API_KEY]
  );

  // Load trending GIFs when picker opens
  useEffect(() => {
    if (showGifPicker) {
      fetchGifs("", "trending");
      setGifCategory("trending");
      setGifSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGifPicker]);

  // Debounced search as user types
  const handleGifSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGifSearch(val);
    if (gifSearchTimerRef.current) clearTimeout(gifSearchTimerRef.current);
    gifSearchTimerRef.current = setTimeout(() => {
      fetchGifs(val, gifCategory);
    }, 400);
  };

  const handleGifSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gifSearchTimerRef.current) clearTimeout(gifSearchTimerRef.current);
    fetchGifs(gifSearch, gifCategory);
  };

  const handleGifCategoryChange = (cat: string) => {
    setGifCategory(cat);
    setGifSearch("");
    fetchGifs("", cat);
  };

  const insertGif = (gif: any) => {
    // Use fixed_height for a consistent display size in chat
    const url: string =
      gif.images?.fixed_height?.url ??
      gif.images?.fixed_height_small?.url ??
      gif.images?.original?.url;
    if (!url || !editor) return;

    // Insert as image with title="via GIPHY" — DeletableImageView reads this
    // to render the GIF header badge in the editor preview.
    // The title attr is also preserved in the sent HTML so ChannelChat can
    // detect and style it with the .message img[title="via GIPHY"] CSS rule.
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: gif.title ?? "GIF", title: "via GIPHY" })
      .run();
    setShowGifPicker(false);
    setGifSearch("");
  };

  // ─── File helpers ──────────────────────────────────────────────────────────

  const removeImageFromEditor = (src: string) => {
    if (!editor) return;
    const { state } = editor;
    let pos: number | null = null;
    state.doc.descendants((node, posInDoc) => {
      if (node.type.name === "image" && node.attrs.src === src) {
        pos = posInDoc;
        return false;
      }
    });
    if (pos !== null) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
    }
  };

  const insertImageFile = async (file: File) => {
    if (!editor) return;
    if (!isAllowedType(file)) {
      setFileError(`File type not allowed. Allowed: ${ALLOWED_LABEL}`);
      return;
    }
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await api.post(`${SERVER_URL}/upload`, formData);
      const data = res.data;
      if (!data.success || !Array.isArray(data.files) || data.files.length === 0) return;
      const uploaded = data.files[0];
      setUploadedFiles((prev) => [...prev, uploaded]);
      if (uploaded.url && !editor.isDestroyed) {
        editor.chain().focus().setImage({ src: uploaded.url }).run();
      }
    } catch (err) {
      console.error("insertImageFile upload error", err);
    }
  };

  // ─── File input change ─────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    window.dispatchEvent(new Event("closeFileUpload"));
    setFileError(null);

    const files = Array.from(e.target.files);

    // Validate all files first
    const rejected = files.filter((f) => !isAllowedType(f));
    if (rejected.length > 0) {
      setFileError(
        `${rejected.map((f) => f.name).join(", ")} cannot be sent. Allowed: ${ALLOWED_LABEL}`
      );
    }

    const accepted = files.filter(isAllowedType);
    if (accepted.length === 0) {
      e.target.value = "";
      return;
    }

    for (const file of accepted) {
      const id = crypto.randomUUID();
      // Create blob URL ONCE and never recreate it (fixes double-image flash)
      const preview = URL.createObjectURL(file);

      setUploading((prev) => [
        ...prev,
        { uploading: true as const, id, name: file.name, preview, progress: 0 },
      ]);

      const formData = new FormData();
      formData.append("files", file);

      try {
        const res = await api.post(`${SERVER_URL}/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: percent } : u))
            );
          },
        });

        const uploaded = res.data.files?.[0];
        if (uploaded) {
          setUploadedFiles((prev) => [...prev, uploaded]);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setFileError("Upload failed. Please try again.");
      } finally {
        // Revoke the blob URL only after we've moved to the server URL
        URL.revokeObjectURL(preview);
        setUploading((prev) => prev.filter((u) => u.id !== id));
      }
    }

    e.target.value = "";
  };

  // ─── Process externally dropped files (from drag-and-drop over chat area) ────
  // Runs the same upload pipeline as handleFileChange whenever the parent
  // passes new files via the `dropFiles` prop.

  useEffect(() => {
    if (!dropFiles || dropFiles.length === 0) return;

    setFileError(null);

    const rejected = dropFiles.filter((f) => !isAllowedType(f));
    if (rejected.length > 0) {
      setFileError(
        `${rejected.map((f) => f.name).join(", ")} cannot be sent. Allowed: ${ALLOWED_LABEL}`
      );
    }

    const accepted = dropFiles.filter(isAllowedType);

    // Tell parent we've consumed the files so it can clear its state
    onDropFilesConsumed?.();

    if (accepted.length === 0) return;

    (async () => {
      for (const file of accepted) {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);

        setUploading((prev) => [
          ...prev,
          { uploading: true as const, id, name: file.name, preview, progress: 0 },
        ]);

        const formData = new FormData();
        formData.append("files", file);

        try {
          const res = await api.post(`${SERVER_URL}/upload`, formData, {
            onUploadProgress: (progressEvent) => {
              const percent = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              setUploading((prev) =>
                prev.map((u) => (u.id === id ? { ...u, progress: percent } : u))
              );
            },
          });

          const uploaded = res.data.files?.[0];
          if (uploaded) setUploadedFiles((prev) => [...prev, uploaded]);
        } catch (err) {
          console.error("Drop upload error:", err);
          setFileError("Upload failed. Please try again.");
        } finally {
          URL.revokeObjectURL(preview);
          setUploading((prev) => prev.filter((u) => u.id !== id));
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropFiles]);

  const deleteUploadedFile = async (index: number) => {
    const file = uploadedFiles[index];
    if (!file) return;
    try {
      const res = await api.post(`${SERVER_URL}/upload/delete`, { path: file.path });
      if (res.data.success) {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
        if (file.url) removeImageFromEditor(file.url);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // ─── Mention state ────────────────────────────────────────────────────────────
  // All callbacks defined AFTER useEditor to avoid "before initialization" error.
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<{ id: string; name: string; avatar_url?: string | null }[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  // Stable refs — safe to read inside useEditor's handleKeyDown without stale closures
  const mentionStartPosRef = useRef<number | null>(null);
  const mentionOpenRef = useRef(false);
  const closeMentionRef = useRef<() => void>(() => {});
  const selectMentionByIndexRef = useRef<() => void>(() => {});

  // Fetch users as query changes
  useEffect(() => {
    if (!mentionOpen) { setMentionUsers([]); return; }
    const controller = new AbortController();
    (async () => {
      setMentionLoading(true);
      try {
        const res = await api.get("/users/search", {
          params: { q: mentionQuery || "a", limit: 8 },
          signal: controller.signal,
        });
        setMentionUsers(res.data ?? []);
        setMentionIndex(0);
      } catch (err: any) {
        if (err.name !== "AbortError") setMentionUsers([]);
      } finally {
        setMentionLoading(false);
      }
    })();
    return () => controller.abort();
  }, [mentionQuery, mentionOpen]);

  // ─── Editor ────────────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Allow shift+enter to create new list items by NOT intercepting enter in lists
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      DeletableImage,
      Highlight,
      Color,
      MentionChip,
      CharacterCount.configure({ limit: 5000 }),
      Placeholder.configure({
        // Only show the placeholder when the entire document is a single empty paragraph.
        // This prevents the ghost placeholder appearing after exiting a list via double-Enter.
        placeholder: ({ editor: e }) => {
          const { doc } = e.state;
          const isDocEmpty =
            doc.childCount === 1 &&
            doc.firstChild?.type.name === "paragraph" &&
            doc.firstChild?.content.size === 0;
          return isDocEmpty ? "Write a message..." : "";
        },
        showOnlyCurrent: false,
        showOnlyWhenEditable: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[40px]",
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;

        // ── Mention navigation ─────────────────────────────────────────────────
        if (mentionOpenRef.current) {
          if (event.key === "Escape") {
            closeMentionRef.current();
            event.preventDefault();
            return true;
          }
          if (event.key === "ArrowDown") {
            setMentionIndex((i) => i + 1);
            event.preventDefault();
            return true;
          }
          if (event.key === "ArrowUp") {
            setMentionIndex((i) => Math.max(0, i - 1));
            event.preventDefault();
            return true;
          }
          if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
            selectMentionByIndexRef.current();
            event.preventDefault();
            return true;
          }
          if (event.key === " " || (event.key === "Backspace" && state.selection.from <= (mentionStartPosRef.current ?? 0) + 1)) {
            closeMentionRef.current();
          }
        }

        // ── Escape cancels edit mode ───────────────────────────────────────────
        if (event.key === "Escape" && !mentionOpenRef.current) {
          if (onCancelEdit) {
            onCancelEdit();
            editor?.commands.clearContent();
            event.preventDefault();
            return true;
          }
        }

        // ── Detect @ typed ─────────────────────────────────────────────────────
        if (event.key === "@") {
          mentionStartPosRef.current = state.selection.from;
          mentionOpenRef.current = true;
          setMentionOpen(true);
          setMentionQuery("");
        }

        // ── List handling ───────────────────────────────────────────────────────
        const inList =
          state.schema.nodes.listItem &&
          selection.$anchor.node(-1)?.type === state.schema.nodes.listItem;

        if (inList) {
          if (event.key === "Enter" && event.shiftKey) {
            editor?.chain().focus().setHardBreak().run();
            event.preventDefault();
            return true;
          }
          return false;
        }

        // Outside a list: Enter sends, Shift+Enter = line break
        if (event.key === "Enter" && !event.shiftKey) {
          if (mentionOpenRef.current) {
            selectMentionByIndexRef.current();
            event.preventDefault();
            return true;
          }
          event.preventDefault();
          handleSend();
          return true;
        }

        if (event.key === "Enter" && event.shiftKey) {
          editor?.chain().focus().setHardBreak().run();
          event.preventDefault();
          return true;
        }

        return false;
      },
      handlePaste: (_, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) insertImageFile(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_, event) => {
        // Prevent Tiptap from natively handling file drops.
        // Files dropped on the chat area are routed through the parent's
        // dropFiles prop → our upload pipeline, so we must stop Tiptap from
        // also inserting a second copy of the image via its built-in handler.
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length > 0) {
          event.preventDefault();
          return true; // handled — block default Tiptap behaviour
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // ─── Mention callbacks — defined AFTER useEditor ─────────────────────────────
  const closeMention = useCallback(() => {
    mentionOpenRef.current = false;
    setMentionOpen(false);
    setMentionQuery("");
    setMentionUsers([]);
    mentionStartPosRef.current = null;
  }, []);

  const handleMentionSelect = useCallback((user: { id: string; name: string }) => {
    if (!editor) return;
    const startPos = mentionStartPosRef.current;
    if (startPos == null) return;
    const currentPos = editor.state.selection.from;
    // Delete the @query text then insert a mention node (not raw HTML)
    editor
      .chain()
      .focus()
      .deleteRange({ from: startPos, to: currentPos })
      .insertContent({
        type: "mentionChip",
        attrs: { userId: user.id, label: user.name },
      })
      .insertContent(" ")
      .run();
    closeMention();
  }, [editor, closeMention]);

  // Keep refs pointing at latest callbacks
  useEffect(() => { closeMentionRef.current = closeMention; }, [closeMention]);
  useEffect(() => {
    selectMentionByIndexRef.current = () => {
      const idx = mentionIndex % Math.max(mentionUsers.length, 1);
      if (mentionUsers[idx]) handleMentionSelect(mentionUsers[idx]);
    };
  });

 useEffect(() => {
  if (!editor) return;

  const onUpdate = () => {
    if (!mentionOpenRef.current || mentionStartPosRef.current == null) return;

    const { state } = editor;
    const cur = state.selection.from;
    const start = mentionStartPosRef.current;

    if (cur <= start) {
      closeMentionRef.current();
      return;
    }

    const raw = state.doc.textBetween(start, cur, "");
    const query = raw.startsWith("@") ? raw.slice(1) : raw;

    if (query.includes(" ")) {
      closeMentionRef.current();
      return;
    }

    setMentionQuery(query);
  };

  editor.on("update", onUpdate);

  return () => {
    editor.off("update", onUpdate); // ← now returns void
  };
}, [editor]);

  // Force re-render on selection / transaction to keep toolbar active states
  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // ─── Load initial content when entering edit mode ────────────────────────────
  // When editingMessageId is set, populate the editor with the existing message
  // content so the user can modify it. When cleared (cancel/save), wipe it.
  // `editor` is included in deps so this re-runs once the editor is initialized.
  useEffect(() => {
    if (!editor) return;
    if (editingMessageId && editingInitialContent) {
      // Use a short timeout to ensure the editor is fully mounted and ready
      const timer = setTimeout(() => {
        if (editor.isDestroyed) return;
        editor.commands.setContent(editingInitialContent,  {
  emitUpdate: false,
});
        // Move cursor to end
        editor.commands.focus("end");
      }, 0);
      return () => clearTimeout(timer);
    } else if (!editingMessageId) {
      editor.commands.clearContent();
      setUploadedFiles([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editingMessageId, editingInitialContent]);

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!editor) return;
    const html = editor.getHTML();

    // Strip tags and check for blank-only content
    const textContent = html.replace(/<[^>]*>/g, "").trim();
    const isEmpty =
      textContent === "" &&
      !html.includes("<img") &&
      uploadedFiles.length === 0;

    if (isEmpty) return;

    if (editingMessageId && onSaveEdit) {
      onSaveEdit(editingMessageId, html, uploadedFiles as any);
    } else {
      onSend(html, uploadedFiles as any);
    }

    editor.commands.clearContent();
    setUploadedFiles([]);
  };

  // ─── Emoji ─────────────────────────────────────────────────────────────────

  const addEmoji = (emoji: any) => {
    editor?.chain().focus().insertContent(emoji.native).run();
  };

  // ─── Preview list ──────────────────────────────────────────────────────────

  const previewFiles: PreviewFile[] = [
    ...uploading,
    ...uploadedFiles.map(
      (file): UploadedPreview => ({ ...file, uploading: false as const })
    ),
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-2 w-full message-box border overflow-hidden rounded-xl bg-[var(--chat_bg)] ${in_thread ? "-translate-y-[5px]" : "-translate-y-[10px]"}`}>
      <style>{`
        .mention-chip {
          display: inline;
          background: rgba(29,155,240,0.12);
          color: rgb(29,155,240);
          border-radius: 3px;
          padding: 0 3px;
          font-weight: 600;
          cursor: default;
          user-select: all;
        }
        .dark .mention-chip {
          background: rgba(29,155,240,0.2);
        }
      `}</style>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 flex-wrap p-1 bg-gray-200">
        <ToolbarButton
          editor={editor}
          command="toggleBold"
          label={<img src="/assets/icons/bold.svg" alt="Bold" width={18} height={18} />}
        />
        <ToolbarButton
          editor={editor}
          command="toggleItalic"
          label={<img src="/assets/icons/italic.svg" alt="Italic" width={18} height={18} />}
        />
        <ToolbarButton editor={editor} command="toggleUnderline" label={<FiUnderline />} />
        <ToolbarButton
          editor={editor}
          command="toggleBulletList"
          label={
            <img src="/assets/icons/unorderlist.svg" alt="Bullet list" width={18} height={18} />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleOrderedList"
          label={
            <img src="/assets/icons/orderlist.svg" alt="Ordered list" width={18} height={18} />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleCode"
          label={<img src="/assets/icons/icon.svg" alt="Code" width={18} height={18} />}
        />

        <input
          type="file"
          multiple
          id="file-upload"
          className="hidden"
          // Only accept allowed types — browser-level hint
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileChange}
        />
      </div>

      {/* ── Mention dropdown — floats above the editor, below toolbar ────────── */}
      {mentionOpen && (
        <div className="border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 max-h-52 overflow-y-auto">
          {mentionLoading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
          ) : mentionUsers.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {mentionQuery ? `No users matching "@${mentionQuery}"` : "Start typing a name…"}
            </div>
          ) : (
            mentionUsers.map((u, i) => {
              const isActive = i === mentionIndex % mentionUsers.length;
              return (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMentionSelect(u);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-700"
                  }`}
                >
                  <img
                    src={u.avatar_url ? `/avatar/${u.avatar_url}` : "/avatar/fallback.webp"}
                    alt={u.name}
                    className="w-7 h-7 rounded-sm object-cover shrink-0"
                  />
                  <div>
                    <p className="font-medium text-sm leading-none">{u.name}</p>
                  </div>
                  {isActive && (
                    <span className="ml-auto text-[10px] text-muted-foreground opacity-60">↵</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── Editor + attachments ── */}
      <div className="p-2 dark:bg-zinc-900 relative">
        {/* Scrollable editor area — grows up to 200px then scrolls */}
        <div
          className="max-h-[200px] overflow-y-auto break-words"
          ref={editorWrapperRef}
        >
          <EditorContent editor={editor} />

          {/* File previews */}
          {previewFiles.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-2 w-fit">
              {previewFiles.map((file, i) => {
                const kind = file.uploading
                  ? "image"
                  : getFileKind(file.type, file.name);

                // Index into uploadedFiles array (excludes in-flight items)
                const uploadedIndex = i - uploading.length;

                return (
                  <div
                    key={file.uploading ? file.id : `uploaded-${i}`}
                    className="relative flex flex-col items-center px-2 py-2 rounded-lg cursor-pointer"
                  >
                    {file.uploading ? (
                      /* ── Uploading skeleton ── */
                      <div className="relative w-22 h-22 rounded-md overflow-hidden bg-gray-200">
                        {/* Show the stable blob preview — no flash */}
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover opacity-40 blur-sm"
                        />
                        {/* Progress overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-700 bg-white/70 rounded px-1">
                            {file.progress}%
                          </span>
                        </div>
                      </div>
                    ) : kind === "image" ? (
                      <>
                        <button
                          onClick={() => deleteUploadedFile(uploadedIndex)}
                          className="absolute top-0 right-0 bg-gray-600 hover:bg-black hover:scale-[1.15] w-6 h-6 rounded-full text-white flex items-center justify-center text-sm cursor-pointer transition-all duration-300 z-10"
                        >
                          <HiXMark />
                        </button>
                        <img
                          src={(file as UploadedPreview).url}
                          alt={file.name}
                          className="w-22 h-22 object-cover rounded-md border border-black"
                        />
                      </>
                    ) : kind === "video" ? (
                      <video
                        src={(file as UploadedPreview).url}
                        className="w-22 h-22 rounded-md border border-black"
                        controls
                      />
                    ) : (
                      <a
                        href={(file as UploadedPreview).url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="py-3 px-7 flex gap-6 items-center justify-center rounded-md border border-black bg-gray-50">
                          <CiFileOn className="text-3xl text-gray-600" />
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── File-type error banner ── */}
        {fileError && (
          <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-red-50 border border-red-300 rounded text-xs text-red-600">
            <span className="flex-1">{fileError}</span>
            <button onClick={() => setFileError(null)} className="shrink-0">
              <HiXMark />
            </button>
          </div>
        )}

        {/* ── Bottom action bar ── */}
        <div className="flex justify-between mt-2 sticky bottom-0">
          <div className="flex flex-row gap-1 items-center">
            {!editingMessageId && (
              <div className="upload-toggle-btn">
                <ToolbarButton
                  size="xxl"
                  editor={editor}
                  command="toggleFileUpload"
                  label={<FiPlus />}
                />
              </div>
            )}

            {/* Emoji picker */}
            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger>
                <Button size="md" variant="editor_buttons">
                  <img
                    src="/assets/icons/emoji.svg"
                    alt="Emoji"
                    width={18}
                    height={18}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[99999]">
                <Picker onEmojiSelect={addEmoji} />
              </PopoverContent>
            </Popover>

            {/* GIF picker */}
            <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
              <PopoverTrigger>
                <Button size="md" variant="editor_buttons" title="Send a GIF">
                  <span className="text-[10px] font-bold leading-none tracking-tight">
                    GIF
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[99999] p-0 overflow-hidden rounded-xl shadow-xl border border-gray-200">
                {/* Header */}
                <div className="px-3 pt-3 pb-2 bg-gradient-to-r from-violet-500 to-indigo-500">
                  <form onSubmit={handleGifSearchSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={gifSearch}
                      onChange={handleGifSearchChange}
                      placeholder="Search GIFs…"
                      autoFocus
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      Go
                    </button>
                  </form>
                </div>

                {/* Category tabs */}
                {!gifSearch && (
                  <div className="flex gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide bg-gray-50 border-b border-gray-100">
                    {GIF_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => handleGifCategoryChange(cat.value)}
                        className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-full font-medium transition-all ${
                          gifCategory === cat.value
                            ? "bg-indigo-500 text-white shadow-sm"
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* GIF grid */}
                <div className="max-h-56 overflow-y-auto bg-white">
                  {gifLoading ? (
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded bg-gray-100 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : gifs.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-8">
                      {GIPHY_API_KEY ? "No GIFs found" : "⚠️ Set NEXT_PUBLIC_GIPHY_API_KEY"}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {gifs.map((gif) => (
                        <button
                          key={gif.id}
                          onClick={() => insertGif(gif)}
                          className="aspect-square overflow-hidden rounded hover:ring-2 hover:ring-indigo-400 hover:scale-[1.03] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          title={gif.title}
                        >
                          <img
                            src={
                              gif.images?.fixed_width_small?.url ??
                              gif.images?.fixed_height_small?.url ??
                              gif.images?.fixed_height?.url
                            }
                            alt={gif.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GIPHY attribution — required by their API ToS */}
                <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Powered by</span>
                  <img
                    src="https://developers.giphy.com/branch/master/static/header-logo-8974b8ae658f704a5b48a2d039b8ad93.gif"
                    alt="GIPHY"
                    className="h-3 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling!.classList.remove("hidden");
                    }}
                  />
                  <span className="hidden text-[10px] font-bold text-indigo-500">GIPHY</span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Mention button — types @ into editor */}
            <button
              type="button"
              title="Mention someone"
              className="px-1 py-1 rounded hover:bg-gray-200 text-sm"
              onClick={() => {
                if (!editor) return;
                mentionStartPosRef.current = editor.state.selection.from;
                mentionOpenRef.current = true;
                editor.chain().focus().insertContent("@").run();
                setMentionOpen(true);
                setMentionQuery("");
              }}
            >
              <img
                src="/assets/icons/mantion.svg"
                alt="Mention"
                width={18}
                height={18}
              />
            </button>
          </div>

          {/* Send / Update / Cancel */}
          <div>
            {editingMessageId ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSend}>
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onCancelEdit?.();
                    editor?.commands.clearContent();
                    setUploadedFiles([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="xl" variant="isactive" onClick={handleSend}>
                <IoMdSend />
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────

function ToolbarButton({ editor, command, label, size = "md" }: any) {
  if (!editor) return null;

  const activeMap: Record<string, string> = {
    toggleBold: "bold",
    toggleItalic: "italic",
    toggleUnderline: "underline",
    toggleBulletList: "bulletList",
    toggleOrderedList: "orderedList",
    toggleCode: "code",
  };

  const isActive = activeMap[command] ? editor.isActive(activeMap[command]) : false;

  const run = () => {
    if (command === "toggleFileUpload") {
      window.dispatchEvent(new CustomEvent("toggleFileUpload"));
      return;
    }
    editor.chain().focus()[command]().run();
  };

  return (
    <Button size={size} variant={isActive ? "default" : "editor_buttons"} onClick={run}>
      {label}
    </Button>
  );
}