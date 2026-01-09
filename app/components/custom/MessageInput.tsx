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

  // file upload and delete

  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string; type: string }[]
  >([]);

  const insertImageFile = async (file: File) => {
    // Upload to server
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (data.url) {
      // Add to uploadedFiles state
      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, url: data.url, type: file.type },
      ]);

      // Insert into TipTap editor
      editor?.chain().focus().setImage({ src: data.url }).run();
    }
  };

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

  const deleteUploadedFile = async (index: any) => {
    const file = uploadedFiles[index];
    if (!file) return;

    try {
      const res = await fetch("/api/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.url.replace(/^\/?/, "") }),
      });

      const data = await res.json();

      if (data.success) {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

        // Remove image from editor
        removeImageFromEditor(file.url);
      } else {
        alert(data.message || "Failed to delete file");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting file");
    }
  };

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
    if (isEmpty && attachedFiles.length === 0) return;

    // If in edit mode, call onSaveEdit instead of onSend
    if (editingMessageId && onSaveEdit) {
      onSaveEdit(editingMessageId, html, attachedFiles);
    } else {
      onSend(html, attachedFiles);
    }

    // After sending or saving, clear editor and files
    editor.commands.clearContent();
    setAttachedFiles([]);
  };

  const addEmoji = (emoji: any) => {
    editor?.chain().focus().insertContent(emoji.native).run();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setUploadedFiles((prev) => [
        ...prev,
        {
          name: data.name,
          url: data.url,
          type: file.type,
        },
      ]);
    }

    // ✅ CLOSE upload menu (no functional change)
    window.dispatchEvent(new Event("closeFileUpload"));

    // reset input
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const insertImage = (file: File) => {
    const url = URL.createObjectURL(file);
    editor?.chain().focus().setImage({ src: url }).run();
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

  //mention
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 1 });

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from } = editor.state.selection;

      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 2),
        from,
        "\0",
        "\0"
      );

      if (textBefore === " @" || textBefore === "@") {
        const coords = editor.view.coordsAtPos(from);

        setMentionPosition({
          top: coords.bottom + 6,
          left: coords.left,
        });

        setMentionOpen(true);
      } else {
        setMentionOpen(false);
      }
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate); // ✅ returns void now
    };
  }, [editor]);

  const handleMentionSelect = (name: string) => {
    editor
      ?.chain()
      .focus()
      .deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from,
      })
      .insertContent(`@${name} `)
      .run();
    setMentionOpen(false);
  };

  //mention end
  return (
    <div className="flex flex-col gap-2 w-full message-box border overflow-hidden rounded-xl ">
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
              <ToolbarButton
                size="xxl"
                editor={editor}
                command="toggleFileUpload"
                label={<FiPlus />}
                className=""
              />

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

// const [users, setUsers] = useState<
//   { name: string; status: "online" | "offline" }[]
// >([]);
// const [loadingUsers, setLoadingUsers] = useState(false);

// const fetchUsers = async () => {
//   try {
//     setLoadingUsers(true);

//     const res = await fetch("http://localhost:5000/api/user");
//     const data = await res.json();

//     // adjust mapping based on your API response
//     const mappedUsers = data.map((u: any) => ({
//       name: u.name,        // or u.username
//       status: u.online ? "online" : "offline",
//     }));

//     setUsers(mappedUsers);
//   } catch (err) {
//     console.error("Failed to fetch users", err);
//   } finally {
//     setLoadingUsers(false);
//   }
// };

// useEffect(() => {
//   if (!editor) return;

//   const handleUpdate = () => {
//     const { from } = editor.state.selection;
//     const textBefore = editor.state.doc.textBetween(
//       Math.max(0, from - 2),
//       from,
//       "\0",
//       "\0"
//     );

//     if (textBefore === " @" || textBefore === "@") {
//       const coords = editor.view.coordsAtPos(from);

//       setMentionPosition({
//         top: coords.bottom + 6,
//         left: coords.left,
//       });

//       setMentionOpen(true);

//       // fetch only once
//       if (users.length === 0) {
//         fetchUsers();
//       }
//     } else {
//       setMentionOpen(false);
//     }
//   };

//   editor.on("update", handleUpdate);
//   return () => editor.off("update", handleUpdate);
// }, [editor, users.length]);

{
  /* <MentionDropdown
  open={mentionOpen}
  onOpenChange={setMentionOpen}
  users={users}
  position={mentionPosition}
  onSelect={handleMentionSelect}
/> */
}
//
