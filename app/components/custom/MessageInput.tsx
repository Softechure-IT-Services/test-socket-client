// // MessageInput.tsx
// "use client";
// import { useEffect, useState, useRef } from "react";
// import { EditorContent, useEditor } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Underline from "@tiptap/extension-underline";
// import Link from "@tiptap/extension-link";
// import Image from "@tiptap/extension-image";
// import Placeholder from "@tiptap/extension-placeholder";
// import Highlight from "@tiptap/extension-highlight";
// import Color from "@tiptap/extension-color";
// import CharacterCount from "@tiptap/extension-character-count";
// import { Button } from "@/app/components/ui/button";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/app/components/ui/popover";
// import Picker from "@emoji-mart/react";
// import { VscMention } from "react-icons/vsc";
// import { FaListUl, FaListOl } from "react-icons/fa6";
// import MentionDropdown from "@/app/components/ui/mention";
// import { IoMdSend } from "react-icons/io";
// import { CiFileOn } from "react-icons/ci";
// import { CiCirclePlus } from "react-icons/ci";
// import { FiUnderline } from "react-icons/fi";
// import { FiPlus } from "react-icons/fi";
// import api from "@/lib/axios";
// import { HiXMark } from "react-icons/hi2";

// type UploadedFile = {
//   name: string;
//   url: string;
//   type: string;
//   path: string;
//   size: number;
// };
// type UploadingFile = {
//   id: string;
//   name: string;
//   preview: string; // blob URL
//   progress: number;
// };

// type UploadingPreview = {
//   uploading: true;
//   id: string;
//   name: string;
//   preview: string;
//   progress: number;
// };

// type UploadedPreview = {
//   uploading: false;
//   name: string;
//   url: string;
//   type: string;
//   path: string;
//   size: number;
// };

// type PreviewFile = UploadingPreview | UploadedPreview;


// const getFileKind = (type: string, name: string) => {
//   if (type.startsWith("image/")) return "image";
//   if (type.startsWith("video/")) return "video";
//   if (type === "application/pdf") return "pdf";
//   if (type.startsWith("text/") || name.endsWith(".txt")) return "text";
//   return "other";
// };
// interface MessageInputProps {
//   onSend: (content: string, files?: File[]) => void;
//   // new props for edit flow
//   editingMessageId?: string | null;
//   editingInitialContent?: string;
//   onSaveEdit?: (messageId: string, content: string, files?: File[]) => void;
//   onCancelEdit?: () => void;
// }

// export default function MessageInput({
//   onSend,
//   editingMessageId = null,
//   editingInitialContent = "",
//   onSaveEdit,
//   onCancelEdit,
// }: MessageInputProps) {
//   const [showEmoji, setShowEmoji] = useState(false);
//   const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
//   const editorRef = useRef<HTMLDivElement>(null);
//   // for editor
//   const [, forceUpdate] = useState(0);
//   const [uploading, setUploading] = useState<UploadingFile[]>([]);
  
//   // function CircularProgress({ value }: { value: number }) {
//   //   const radius = 18;
//   //   const stroke = 3;
//   //   const normalizedRadius = radius - stroke * 2;
//   //   const circumference = normalizedRadius * 2 * Math.PI;
//   //   const strokeDashoffset =
//   //     circumference - (value / 100) * circumference;
  
//   //   return (
//   //     <svg height={radius * 2} width={radius * 2}>
//   //       <circle
//   //         stroke="#e5e7eb"
//   //         fill="transparent"
//   //         strokeWidth={stroke}
//   //         r={normalizedRadius}
//   //         cx={radius}
//   //         cy={radius}
//   //       />
//   //       <circle
//   //         stroke="#3b82f6"
//   //         fill="transparent"
//   //         strokeWidth={stroke}
//   //         strokeDasharray={`${circumference} ${circumference}`}
//   //         style={{ strokeDashoffset, transition: "stroke-dashoffset 0.2s" }}
//   //         r={normalizedRadius}
//   //         cx={radius}
//   //         cy={radius}
//   //       />
//   //       <text
//   //         x="50%"
//   //         y="50%"
//   //         dominantBaseline="middle"
//   //         textAnchor="middle"
//   //         fontSize="9"
//   //         fill="#111"
//   //       >
//   //         {value}%
//   //       </text>
//   //     </svg>
//   //   );
//   // }
  
//   // put SERVER_URL at top of file (or use NEXT_PUBLIC_SERVER_URL directly)
//   const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://192.168.0.113:5000";

//   // file upload and delete

//   const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

//   const removeImageFromEditor = (src: any) => {
//     if (!editor) return;

//     const { state, view } = editor;
//     const { doc, tr } = state;

//     // Find the image node with matching src
//     let pos = null;
//     doc.descendants((node, posInDoc) => {
//       if (node.type.name === "image" && node.attrs.src === src) {
//         pos = posInDoc;
//         return false; // stop iteration
//       }
//     });

//     if (pos !== null) {
//       // Delete the image node
//       editor
//         .chain()
//         .focus()
//         .deleteRange({ from: pos, to: pos + 1 })
//         .run();
//     }
//   };


// const insertImageFile = async (file: File) => {
//   console.log("Inserting image file:", file);
//   if (!editor) return;

//   const formData = new FormData();
//   formData.append("files", file);

//   try {
//     const res = await api.post(`${SERVER_URL}/upload`, formData);
//     const data = res.data;

//     if (!data.success || !Array.isArray(data.files) || data.files.length === 0) {
//       console.error("Upload failed:", data);
//       return;
//     }

//     const uploaded = data.files[0];
//     setUploadedFiles((prev) => [...prev, uploaded]);

//     // Insert into editor once URL is ready
//     if (uploaded.url && !editor.isDestroyed) {
//       editor.chain().focus().setImage({ src: uploaded.url }).run();
//     }
//   } catch (err) {
//     console.error("insertImageFile upload error", err);
//   }
// };



// // const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
// //   if (!e.target.files) return;
// //   const files = Array.from(e.target.files);

// //   // batch upload all selected files in one request
// //   const formData = new FormData();
// //   files.forEach((f) => formData.append("files", f));

// //   try {
// //     const res = await api.post(`${SERVER_URL}/upload`, formData);
// //     const data = res.data;
// //     if (!data.success || !Array.isArray(data.files)) {
// //       console.error("Upload failed:", data);
// //       e.target.value = "";
// //       return;
// //     }

// //     // Append all returned file metadata
// //     setUploadedFiles((prev) => [
// //       ...prev,
// //       ...data.files.map((f: any) => ({
// //         name: f.name,
// //         url: f.url,
// //         type: f.type,
// //         path: f.path,
// //         size: f.size,
// //       })),
// //     ]);
// //   } catch (err) {
// //     console.error("Upload error:", err);
// //   }

// //   // Close upload menu
// //   window.dispatchEvent(new Event("closeFileUpload"));

// //   // Reset input
// //   e.target.value = "";
// // };

// const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//   if (!e.target.files) return;
//   window.dispatchEvent(new Event("closeFileUpload"));

//   const files = Array.from(e.target.files);

//   for (const file of files) {
//     const id = crypto.randomUUID();
//     const preview = URL.createObjectURL(file);
//     setUploading((prev) => [...prev, { id, name: file.name, preview, progress: 0 }]);

//     const formData = new FormData();
//     formData.append("files", file);

//     try {
//       const res = await api.post(`${SERVER_URL}/upload`, formData, {
//         onUploadProgress: (progressEvent) => {
//           const percent = Math.round(
//             (progressEvent.loaded * 100) / (progressEvent.total || 1)
//           );

//           setUploading((prev) =>
//             prev.map((u) => (u.id === id ? { ...u, progress: percent } : u))
//           );
//         },
//       });

//       const uploaded = res.data.files[0];
//       setUploadedFiles((prev) => [...prev, uploaded]);
//     } catch (err) {
//       console.error("Upload error:", err);
//     } finally {
//       setUploading((prev) => prev.filter((u) => u.id !== id));
//     }
//   }

//   e.target.value = "";
// };




// const deleteUploadedFile = async (index: number) => {
//   const file = uploadedFiles[index];
//   if (!file) return;

//   try {
//     const res = await api.post(`${SERVER_URL}/upload/delete`, { path: file.path });
//     const data = res.data;

//     if (data.success) {
//       setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
//       // If the file was also inserted in editor, remove it
//       if (file.url) removeImageFromEditor(file.url);
//     } else {
//       console.error("Delete failed:", data);
//     }
//   } catch (err) {
//     console.error("Delete error:", err);
//   }
// };


//   //mention
//   const [mentionOpen, setMentionOpen] = useState(false);
//   const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 1 });

//   useEffect(() => {
//     const handleKey = (e: KeyboardEvent) => {
//       if (e.key === "@") {
//         const selection = window.getSelection();
//         if (!selection?.rangeCount) return;

//         const range = selection.getRangeAt(0);
//         const rect = range.getBoundingClientRect();

//         setMentionPosition({
//           top: rect.top + 6,
//           left: rect.left,
//         });

//         setMentionOpen(true);
//       }
//     };

//     window.addEventListener("keyup", handleKey);
//     return () => window.removeEventListener("keyup", handleKey);
//   }, []);

//   const handleMentionSelect = (name: string) => {
//     editor?.chain().focus().insertContent(`${name} `).run();
//     setMentionOpen(false);
//   };
//   //mention end
//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       Underline,
//       Link.configure({ openOnClick: false }),
//       Image,
//       Highlight,
//       Color,
//       CharacterCount.configure({ limit: 5000 }),
// Placeholder.configure({
//   placeholder: "Write a message...",
//   showOnlyCurrent: false,
//   showOnlyWhenEditable: true,
// }),
//     ],
//     content: "",
//     editorProps: {
//       attributes: {
//         class:
//           "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[40px]",
//       },
//       handleKeyDown: (view, event) => {
//         if (event.key === "Enter" && !event.shiftKey) {
//           event.preventDefault();
//           handleSend(); // uses your existing function
//           return true;
//         }
//         return false;
//       },
//       handlePaste: (view, event) => {
//         const items = event.clipboardData?.items;
//         if (!items) return false;

//         for (const item of items) {
//           if (item.type.startsWith("image/")) {
//             const file = item.getAsFile();
//             if (file) insertImageFile(file); // make sure this function is defined
//             return true;
//           }
//         }

//         return false;
//       },
//       handleDrop: (view, event) => {
//         event.preventDefault();
//         const files = Array.from(event.dataTransfer?.files || []);
//         files.forEach((file) => insertImageFile(file));
//       },
//     },
//     immediatelyRender: false,
//   });

//   // When editingInitialContent changes (i.e. user clicked Edit), load it into the editor
//   useEffect(() => {
//     if (!editor) return;
//     if (editingMessageId) {
//       // set html content
//       editor.commands.setContent(editingInitialContent || "");
//       editor.commands.focus();
//     } else {
//       // if editing canceled or finished, clear editor
//       // but do not clear if user is actively composing and editingMessageId is null due to initial mount
//       // we'll only clear if there's no selection and content is empty — for simplicity, clear when editingMessageId becomes null
//       // (This behaviour can be adjusted)
//       // editor.commands.clearContent();
//     }
//   }, [editingMessageId, editingInitialContent, editor]);

//   useEffect(() => {
//     if (!editorRef.current) return;
//     editorRef.current.scrollTop = editorRef.current.scrollHeight;
//   }, [editor?.getText()]);

//  const handleSend = () => {
//   if (!editor) return;
//   const html = editor.getHTML();
//   const isEmpty = html.trim() === "<p></p>";
//   if (isEmpty && uploadedFiles.length === 0) return; // use uploadedFiles, not attachedFiles

//   // If in edit mode, call onSaveEdit instead of onSend
//   if (editingMessageId && onSaveEdit) {
//     onSaveEdit(editingMessageId, html, uploadedFiles as any);
//   } else {
//     // send message content + uploaded file metadata
//     onSend(html, uploadedFiles as any);
//   }

//   // After sending or saving, clear editor and files
//   editor.commands.clearContent();
//   setUploadedFiles([]); // clear metadata after send
//   setAttachedFiles([]); // keep attachedFiles for backwards compatibility if used elsewhere
// };


//   const addEmoji = (emoji: any) => {
//     editor?.chain().focus().insertContent(emoji.native).run();
//   };

//  const removeFile = async (index: number) => {
//   const file = uploadedFiles[index];
//   if (!file) return;

//   try {
//     const res = await api.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/upload/delete`, { path: file.path });
//     const data = res.data;

//     if (data.success) {
//       setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
//     } else {
//       console.error("Delete failed:", data.error);
//     }
//   } catch (err) {
//     console.error("Delete error:", err);
//   }
// };


//  const insertImage = (file: { url: string }) => {
//   editor?.chain().focus().setImage({ src: file.url }).run();
// };


//   const insertLink = () => {
//     const url = prompt("Enter URL");
//     if (!url) return;
//     editor
//       ?.chain()
//       .focus()
//       .extendMarkRange("link")
//       .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
//       .run();
//   };

//   useEffect(() => {
//     if (!editor) return;

//     const update = () => forceUpdate((n) => n + 1);

//     editor.on("selectionUpdate", update);
//     editor.on("transaction", update);

//     return () => {
//       editor.off("selectionUpdate", update);
//       editor.off("transaction", update);
//     };
//   }, [editor]);

//  const previewFiles: PreviewFile[] = [
//   ...uploading.map(
//     (file): UploadingPreview => ({
//       ...file,
//       uploading: true as const,
//     })
//   ),
//   ...uploadedFiles.map(
//     (file): UploadedPreview => ({
//       ...file,
//       uploading: false as const,
//     })
//   ),
// ];


//   return (
//     <div className="flex flex-col gap-2 w-full message-box border overflow-hidden rounded-xl -translate-y-[10px]">
//       <div className="flex items-center gap-1 flex-wrap p-1 bg-gray-200">
//         <ToolbarButton
//           editor={editor}
//           command="toggleBold"
//           label={
//             <img
//               src="/assets/icons/bold.svg"
//               alt="Plus icon"
//               width={18}
//               height={18}
//               className="black"
//             />
//           }
//         />
//         <ToolbarButton
//           editor={editor}
//           command="toggleItalic"
//           label={
//             <img
//               src="/assets/icons/italic.svg"
//               alt="Plus icon"
//               width={18}
//               height={18}
//               className="black"
//             />
//           }
//         />
//         <ToolbarButton
//           editor={editor}
//           command="toggleUnderline"
//           label={<FiUnderline />}
//         />
//         <ToolbarButton
//           editor={editor}
//           command="toggleBulletList"
//           label={
//             <img
//               src="/assets/icons/unorderlist.svg"
//               alt="Plus icon"
//               width={18}
//               height={18}
//               className="black"
//             />
//           }
//         />
//         <ToolbarButton
//           editor={editor}
//           command="toggleOrderedList"
//           label={
//             <img
//               src="/assets/icons/orderlist.svg"
//               alt="Plus icon"
//               width={18}
//               height={18}
//               className="black"
//             />
//           }
//         />
//         <ToolbarButton
//           editor={editor}
//           command="toggleCode"
//           label={
//             <img
//               src="/assets/icons/icon.svg"
//               alt="Plus icon"
//               width={18}
//               height={18}
//               className="black"
//             />
//           }
//         />

//         <input
//           type="file"
//           multiple
//           id="file-upload"
//           className="hidden"
//           onChange={handleFileChange}
//         />
//         {/* <label htmlFor="file-upload">
//             <Button size="sm">📎</Button>
//           </label> */}

//         {/* When editing, show Update and Cancel buttons — otherwise show Send */}
//       </div>

//       <div className=" p-2  dark:bg-zinc-900 relative" ref={editorRef}>
//         <div className="max-h-[200px] overflow-y-auto break-all">
//           <EditorContent editor={editor} />

//     <div className="flex flex-wrap gap-4 mt-2 w-fit">

      
//   {/* {[
//     ...uploading.map((file) => ({ ...file, uploading: true })), // skeleton files
//     ...uploadedFiles.map((file) => ({ ...file, uploading: false })), // completed files
//   ].map((file, i) => {
//     const kind = file.uploading ? "image" : getFileKind(file.type, file.name); */}

// {previewFiles.map((file, i) => {
//   const kind = file.uploading
//     ? "image"
//     : getFileKind(file.type, file.name);

//     return (
//       <div
//         key={i}
//         className="relative flex flex-col items-center px-2 py-2 rounded-lg cursor-pointer"
//       >
//         {file.uploading ? (
//           <div className="relative w-22 h-22 rounded-md overflow-hidden bg-gray-200 animate-pulse">
//             <img
//               src={file.preview}
//               className="w-full h-full object-cover opacity-40 blur-sm"
//             />
//           </div>
//         ) : kind === "image" ? (
//           <>
//             <button
//               onClick={() => deleteUploadedFile(i - uploading.length)}
//               className="absolute top-0 right-0 bg-gray-600 hover:bg-black hover:scale-[1.15] w-6 h-6 rounded-full text-white flex items-center justify-center text-sm cursor-pointer transition-all .3s"
//             >
//               <HiXMark />
//             </button>
//             <img
//               src={file.url}
//               alt={file.name}
//               className="w-22 h-22 object-cover rounded-md border border-black"
//             />
//           </>
//         ) : kind === "video" ? (
//           <video
//             src={file.url}
//             className="w-22 h-22 rounded-md border border-black"
//             controls
//           />
//         ) : (
//           <a
//             href={file.url}
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <div className="py-3 px-7 flex gap-6 items-center justify-center rounded-md border border-black bg-gray-50">
//               <CiFileOn className="text-3xl text-gray-600" />
//             </div>
//           </a>
//         )}
//       </div>
//     );
//   })}
// </div>


//           <div className="flex justify-between mt-2 sticky bottom-0">
//             <div className="flex flex-row gap-1 items-center">
//                {!editingMessageId && (
//              <div className="upload-toggle-btn">
//                 <ToolbarButton
//                   size="xxl"
//                   editor={editor}
//                   command="toggleFileUpload"
//                   label={<FiPlus />}
//                 />
//               </div>
//                )}
//               <Popover open={showEmoji} onOpenChange={setShowEmoji}>
//                 <PopoverTrigger>
//                   <Button size="md" variant="editor_buttons">
//                     <img
//                       src="/assets/icons/emoji.svg"
//                       alt="Plus icon"
//                       width={18}
//                       height={18}
//                       className="black"
//                     />
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-80 z-[99999]">
//                   <Picker onEmojiSelect={addEmoji} />
//                 </PopoverContent>
//               </Popover>
//               <button
//                 type="button"
//                 className="px-1 py-1 rounded hover:bg-gray-200 text-sm"
//                 onClick={() => {
//                   if (mentionOpen) {
//                     setMentionOpen(false);
//                     return;
//                   }

//                   // Position dropdown near cursor
//                   const selection = window.getSelection();
//                   if (!selection?.rangeCount) return;

//                   const range = selection.getRangeAt(0);
//                   const rect = range.getBoundingClientRect();

//                   setMentionPosition({
//                     top: rect.bottom + window.scrollY + 6,
//                     left: rect.left + window.scrollX,
//                   });

//                   setMentionOpen(true);
//                 }}
//               >
//                 <img
//                   src="/assets/icons/mantion.svg"
//                   alt="Plus icon"
//                   width={18}
//                   height={18}
//                   className="black"
//                 />
//               </button>
//             </div>
//             <div>
//               {editingMessageId ? (
//                 <div className="flex gap-2">
//                   <Button size="sm" onClick={handleSend}>
//                     Update
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="secondary"
//                     onClick={() => {
//                       onCancelEdit?.();
//                       editor?.commands.clearContent();
//                       setAttachedFiles([]);
//                     }}
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               ) : (
//                 <Button size="xl" variant="isactive" onClick={handleSend}>
//                   <IoMdSend />
//                 </Button>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* FLOATING DROPDOWN — not clipped anymore */}
//         <MentionDropdown
//           open={mentionOpen}
//           onOpenChange={setMentionOpen}
//           users={[
//             { name: "Ayush Kumar", status: "offline" },
//             { name: "Satyam Shukla", status: "offline" },
//             { name: "Euachak Singh", status: "offline" },
//             { name: "Sagar Johari", status: "online" },
//           ]}
//           position={mentionPosition}
//           onSelect={handleMentionSelect}
//         />
//       </div>

//       {/* {attachedFiles.length > 0 && (
//           <div className="flex flex-wrap gap-2 mt-2">
//             {attachedFiles.map((file, i) => (
//               <div key={i} className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg dark:bg-zinc-800">
//                 <span className="truncate max-w-[120px]">{file.name}</span>
//                 <button onClick={() => removeFile(i)} className="text-red-500 font-bold"> x</button>
//                 {file.type.startsWith("image/") && (
//                   <button onClick={() => insertImage(file)} className="text-blue-500"> Insert </button>
//                 )}
//               </div>
//             ))}
//           </div>
//         )} */}
//     </div>
//   );
// }

// // function ToolbarButton({ editor, command, label }: any) {
// //   if (!editor) return null;

// //   const isActive = editor.isActive(command.replace("toggle", "").toLowerCase());

// //   const run = () => {
// //     if (command === "toggleFileUpload") {
// //       window.dispatchEvent(new CustomEvent("toggleFileUpload"));
// //       return; // do not run editor command
// //     }

// //     editor.chain().focus()[command]().run();
// //   };

// //   return (
// //     <Button
// //       size="md"
// //       variant={isActive ? "default" : "editor_buttons"}
// //       onClick={run}
// //     >
// //       {label}
// //     </Button>
// //   );
// // }
// function ToolbarButton({ editor, command, label, size = "md" }: any) {
//   if (!editor) return null;

//   const activeMap: Record<string, string> = {
//     toggleBold: "bold",
//     toggleItalic: "italic",
//     toggleUnderline: "underline",
//     toggleBulletList: "bulletList",
//     toggleOrderedList: "orderedList",
//     toggleCode: "code",
//   };

//   const isActive = activeMap[command]
//     ? editor.isActive(activeMap[command])
//     : false;

//   const run = () => {
//     if (command === "toggleFileUpload") {
//       window.dispatchEvent(new CustomEvent("toggleFileUpload"));
//       return;
//     }

//     editor.chain().focus()[command]().run();
//   };

//   return (
//     <Button
//       size={size}
//       variant={isActive ? "default" : "editor_buttons"}
//       onClick={run}
//     >
//       {label}
//     </Button>
//   );
// }
// MessageInput.tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { EditorContent, useEditor, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
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
import MentionDropdown from "@/app/components/ui/mention";
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
  onDropFilesConsumed?: () => void;
}

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

  // ─── Mention ───────────────────────────────────────────────────────────────

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 1 });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "@") {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setMentionPosition({ top: rect.top + 6, left: rect.left });
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

        // Inside a list: Enter creates new list item, Shift+Enter creates <br> / exits
        const inList =
          state.schema.nodes.listItem &&
          selection.$anchor.node(-1)?.type === state.schema.nodes.listItem;

        if (inList) {
          if (event.key === "Enter" && event.shiftKey) {
            // Insert a line break inside the list item without sending
            editor?.chain().focus().setHardBreak().run();
            event.preventDefault();
            return true;
          }
          // Plain Enter in a list → TipTap's default: create new list item
          // Do NOT intercept it here so default list behaviour works.
          return false;
        }

        // Outside a list: Enter sends, Shift+Enter inserts a line break
        if (event.key === "Enter" && !event.shiftKey) {
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
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files || []);
        files.forEach((file) => insertImageFile(file));
      },
    },
    immediatelyRender: false,
  });

  // Load initial content when editing
  useEffect(() => {
    if (!editor) return;
    if (editingMessageId) {
      editor.commands.setContent(editingInitialContent || "");
      editor.commands.focus();
    }
  }, [editingMessageId, editingInitialContent, editor]);

  // Auto-scroll editor area
  useEffect(() => {
    if (!editorWrapperRef.current) return;
    editorWrapperRef.current.scrollTop = editorWrapperRef.current.scrollHeight;
  }, [editor?.getText()]);

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
    <div className="flex flex-col gap-2 w-full message-box border overflow-hidden rounded-xl bg-[var(--chat_bg)] -translate-y-[10px]">
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

            {/* Mention button */}
            <button
              type="button"
              className="px-1 py-1 rounded hover:bg-gray-200 text-sm"
              onClick={() => {
                if (mentionOpen) {
                  setMentionOpen(false);
                  return;
                }
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

      {/* Mention dropdown */}
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