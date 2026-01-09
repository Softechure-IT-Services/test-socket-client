// MessageInput.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
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
import { VscMention } from "react-icons/vsc";
import { FaListUl, FaListOl } from "react-icons/fa6";
import MentionDropdown from "@/app/components/ui/mention";
import { IoMdSend } from "react-icons/io";
import { CiFileOn } from "react-icons/ci";
import { CiCirclePlus } from "react-icons/ci";
import { FiUnderline } from "react-icons/fi";
import { FiPlus } from "react-icons/fi";
type UploadedFile = {
  name: string;
  url: string;
  type: string;
  path: string;
  size: number;
};

const getFileKind = (type: string, name: string) => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || name.endsWith(".txt")) return "text";
  return "other";
};
interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void;
  // new props for edit flow
  editingMessageId?: string | null;
  editingInitialContent?: string;
  onSaveEdit?: (messageId: string, content: string, files?: File[]) => void;
  onCancelEdit?: () => void;
}

export default function MessageInput({
  onSend,
  editingMessageId = null,
  editingInitialContent = "",
  onSaveEdit,
  onCancelEdit,
}: MessageInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  // for editor
  const [, forceUpdate] = useState(0);
  
  // put SERVER_URL at top of file (or use NEXT_PUBLIC_SERVER_URL directly)
  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.0.113:5000";

  // file upload and delete

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const removeImageFromEditor = (src: any) => {
    if (!editor) return;

    const { state, view } = editor;
    const { doc, tr } = state;

    // Find the image node with matching src
    let pos = null;
    doc.descendants((node, posInDoc) => {
      if (node.type.name === "image" && node.attrs.src === src) {
        pos = posInDoc;
        return false; // stop iteration
      }
    });

    if (pos !== null) {
      // Delete the image node
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + 1 })
        .run();
    }
  };


const insertImageFile = async (file: File) => {
  // Upload single image using same "files" field (server expects "files")
  const formData = new FormData();
  formData.append("files", file);

  try {
    const res = await fetch(`${SERVER_URL}/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.files) || data.files.length === 0) {
      console.error("Upload failed:", data);
      return;
    }

    const uploaded = data.files[0]; // { name, path, type, size, url }
    // Add to uploadedFiles state
    setUploadedFiles((prev) => [
      ...prev,
      {
        name: uploaded.name,
        url: uploaded.url,
        type: uploaded.type,
        path: uploaded.path,
        size: uploaded.size,
      },
    ]);

    // Insert into TipTap editor
    editor?.chain().focus().setImage({ src: uploaded.url }).run();
  } catch (err) {
    console.error("insertImageFile upload error", err);
  }
};

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;
  const files = Array.from(e.target.files);

  // batch upload all selected files in one request
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  try {
    const res = await fetch(`${SERVER_URL}/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.files)) {
      console.error("Upload failed:", data);
      e.target.value = "";
      return;
    }

    // Append all returned file metadata
    setUploadedFiles((prev) => [
      ...prev,
      ...data.files.map((f: any) => ({
        name: f.name,
        url: f.url,
        type: f.type,
        path: f.path,
        size: f.size,
      })),
    ]);
  } catch (err) {
    console.error("Upload error:", err);
  }

  // Close upload menu
  window.dispatchEvent(new Event("closeFileUpload"));

  // Reset input
  e.target.value = "";
};

const deleteUploadedFile = async (index: number) => {
  const file = uploadedFiles[index];
  if (!file) return;

  try {
    const res = await fetch(`${SERVER_URL}/upload/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ path: file.path }),
    });
    const data = await res.json();

    if (data.success) {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      // If the file was also inserted in editor, remove it
      if (file.url) removeImageFromEditor(file.url);
    } else {
      console.error("Delete failed:", data);
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
};


  //mention
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 1 });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "@") {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setMentionPosition({
          top: rect.top + 6,
          left: rect.left,
        });

        setMentionOpen(true);
      }
    };

    window.addEventListener("keyup", handleKey);
    return () => window.removeEventListener("keyup", handleKey);
  }, []);

  const handleMentionSelect = (name: string) => {
    editor?.chain().focus().insertContent(`${name} `).run();
    setMentionOpen(false);
  };
  //mention end
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Highlight,
      Color,
      CharacterCount.configure({ limit: 5000 }),
      Placeholder.configure({ placeholder: "Write a message..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[40px]",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSend(); // uses your existing function
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) insertImageFile(file); // make sure this function is defined
            return true;
          }
        }

        return false;
      },
      handleDrop: (view, event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files || []);
        files.forEach((file) => insertImageFile(file));
      },
    },
    immediatelyRender: false,
  });

  // When editingInitialContent changes (i.e. user clicked Edit), load it into the editor
  useEffect(() => {
    if (!editor) return;
    if (editingMessageId) {
      // set html content
      editor.commands.setContent(editingInitialContent || "");
      editor.commands.focus();
    } else {
      // if editing canceled or finished, clear editor
      // but do not clear if user is actively composing and editingMessageId is null due to initial mount
      // we'll only clear if there's no selection and content is empty — for simplicity, clear when editingMessageId becomes null
      // (This behaviour can be adjusted)
      // editor.commands.clearContent();
    }
  }, [editingMessageId, editingInitialContent, editor]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.scrollTop = editorRef.current.scrollHeight;
  }, [editor?.getText()]);

 const handleSend = () => {
  if (!editor) return;
  const html = editor.getHTML();
  const isEmpty = html.trim() === "<p></p>";
  if (isEmpty && uploadedFiles.length === 0) return; // use uploadedFiles, not attachedFiles

  // If in edit mode, call onSaveEdit instead of onSend
  if (editingMessageId && onSaveEdit) {
    onSaveEdit(editingMessageId, html, uploadedFiles as any);
  } else {
    // send message content + uploaded file metadata
    onSend(html, uploadedFiles as any);
  }

  // After sending or saving, clear editor and files
  editor.commands.clearContent();
  setUploadedFiles([]); // clear metadata after send
  setAttachedFiles([]); // keep attachedFiles for backwards compatibility if used elsewhere
};


  const addEmoji = (emoji: any) => {
    editor?.chain().focus().insertContent(emoji.native).run();
  };

 const removeFile = async (index: number) => {
  const file = uploadedFiles[index];
  if (!file) return;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/upload/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path }),
    });

    const data = await res.json();

    if (data.success) {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      console.error("Delete failed:", data.error);
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
};


 const insertImage = (file: { url: string }) => {
  editor?.chain().focus().setImage({ src: file.url }).run();
};


  const insertLink = () => {
    const url = prompt("Enter URL");
    if (!url) return;
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
      .run();
  };

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
  return (
    <div className="flex flex-col gap-2 w-full message-box border overflow-hidden rounded-xl -translate-y-[0.5rem]">
      <div className="flex items-center gap-1 flex-wrap p-1 bg-gray-200">
        <ToolbarButton
          editor={editor}
          command="toggleBold"
          label={
            <img
              src="/assets/icons/bold.svg"
              alt="Plus icon"
              width={18}
              height={18}
              className="black"
            />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleItalic"
          label={
            <img
              src="/assets/icons/italic.svg"
              alt="Plus icon"
              width={18}
              height={18}
              className="black"
            />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleUnderline"
          label={<FiUnderline />}
        />
        <ToolbarButton
          editor={editor}
          command="toggleBulletList"
          label={
            <img
              src="/assets/icons/unorderlist.svg"
              alt="Plus icon"
              width={18}
              height={18}
              className="black"
            />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleOrderedList"
          label={
            <img
              src="/assets/icons/orderlist.svg"
              alt="Plus icon"
              width={18}
              height={18}
              className="black"
            />
          }
        />
        <ToolbarButton
          editor={editor}
          command="toggleCode"
          label={
            <img
              src="/assets/icons/icon.svg"
              alt="Plus icon"
              width={18}
              height={18}
              className="black"
            />
          }
        />

        <input
          type="file"
          multiple
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
        />
        {/* <label htmlFor="file-upload">
            <Button size="sm">📎</Button>
          </label> */}

        {/* When editing, show Update and Cancel buttons — otherwise show Send */}
      </div>

      <div className=" p-2  dark:bg-zinc-900 relative" ref={editorRef}>
        <div className="max-h-[200px] overflow-y-auto break-all">
          <EditorContent editor={editor} />
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-2 w-fit">
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="relative flex flex-col items-center  px-2 py-2 rounded-lg w-36 "
                >
                  {(() => {
                    const kind = getFileKind(file.type, file.name);

                    if (kind === "image") {
                      return (
                        <>
                          <button
                            onClick={() => deleteUploadedFile(i)}
                            className="absolute top-0 right-4 bg-gray-300 hover:bg-red-500 w-6 h-6 rounded-full text-white flex items-center justify-center text-sm"
                          >
                            ×
                          </button>
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-22 h-22 object-cover rounded-md border border-black"
                          />
                        </>
                      );
                    }

                    if (kind === "video") {
                      return (
                        <video
                          src={file.url}
                          className="w-22 h-22 rounded-md border border-black"
                          controls
                        />
                      );
                    }

                    /* 🔹 Default for ALL other file types */
                    return (
                      <>
                        <button
                          onClick={() => deleteUploadedFile(i)}
                          className="absolute top-0 right-4 bg-gray-300 hover:bg-red-500 w-6 h-6 rounded-full text-white flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div className="py-3 px-7 flex gap-6 items-center justify-center rounded-md border border-black bg-gray-50">
                            <CiFileOn className="text-3xl text-gray-600" />
                          </div>
                        </a>
                      </>
                    );

                    return (
                      <div className="w-22 h-22 flex items-center justify-center rounded-md border border-black bg-gray-100">
                        <span className="text-xs truncate">{file.name}</span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-2 sticky bottom-0">
            <div className="flex flex-row gap-1 items-center">
               {!editingMessageId && (
              <ToolbarButton
                size="xxl"
                editor={editor}
                command="toggleFileUpload"
                label={<FiPlus />}
                className=""
              />
               )}
              <Popover open={showEmoji} onOpenChange={setShowEmoji}>
                <PopoverTrigger>
                  <Button size="md" variant="editor_buttons">
                    <img
                      src="/assets/icons/emoji.svg"
                      alt="Plus icon"
                      width={18}
                      height={18}
                      className="black"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-[99999]">
                  <Picker onEmojiSelect={addEmoji} />
                </PopoverContent>
              </Popover>
              <button
                type="button"
                className="px-1 py-1 rounded hover:bg-gray-200 text-sm"
                onClick={() => {
                  if (mentionOpen) {
                    setMentionOpen(false);
                    return;
                  }

                  // Position dropdown near cursor
                  const selection = window.getSelection();
                  if (!selection?.rangeCount) return;

                  const range = selection.getRangeAt(0);
                  const rect = range.getBoundingClientRect();

                  setMentionPosition({
                    top: rect.bottom + window.scrollY + 6,
                    left: rect.left + window.scrollX,
                  });

                  setMentionOpen(true);
                }}
              >
                <img
                  src="/assets/icons/mantion.svg"
                  alt="Plus icon"
                  width={18}
                  height={18}
                  className="black"
                />
              </button>
            </div>
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
                      setAttachedFiles([]);
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

        {/* FLOATING DROPDOWN — not clipped anymore */}
        <MentionDropdown
          open={mentionOpen}
          onOpenChange={setMentionOpen}
          users={[
            { name: "Ayush Kumar", status: "offline" },
            { name: "Satyam Shukla", status: "offline" },
            { name: "Euachak Singh", status: "offline" },
            { name: "Sagar Johari", status: "online" },
          ]}
          position={mentionPosition}
          onSelect={handleMentionSelect}
        />
      </div>

      {/* {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg dark:bg-zinc-800">
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeFile(i)} className="text-red-500 font-bold"> x</button>
                {file.type.startsWith("image/") && (
                  <button onClick={() => insertImage(file)} className="text-blue-500"> Insert </button>
                )}
              </div>
            ))}
          </div>
        )} */}
    </div>
  );
}

// function ToolbarButton({ editor, command, label }: any) {
//   if (!editor) return null;

//   const isActive = editor.isActive(command.replace("toggle", "").toLowerCase());

//   const run = () => {
//     if (command === "toggleFileUpload") {
//       window.dispatchEvent(new CustomEvent("toggleFileUpload"));
//       return; // do not run editor command
//     }

//     editor.chain().focus()[command]().run();
//   };

//   return (
//     <Button
//       size="md"
//       variant={isActive ? "default" : "editor_buttons"}
//       onClick={run}
//     >
//       {label}
//     </Button>
//   );
// }
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

  const isActive = activeMap[command]
    ? editor.isActive(activeMap[command])
    : false;

  const run = () => {
    if (command === "toggleFileUpload") {
      window.dispatchEvent(new CustomEvent("toggleFileUpload"));
      return;
    }

    editor.chain().focus()[command]().run();
  };

  return (
    <Button
      size={size}
      variant={isActive ? "default" : "editor_buttons"}
      onClick={run}
    >
      {label}
    </Button>
  );
}
