

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
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Picker from "@emoji-mart/react";
import { FaListUl, FaListOl } from "react-icons/fa6";
import MentionDropdown from "@/components/ui/mention";

interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void;
  // new props for edit flow
  editingMessageId?: string | null;
  editingInitialContent?: string;
  onSaveEdit?: (messageId: string, content: string, files?: File[]) => void;
  onCancelEdit?: () => void;
}

export default function MessageInput({ onSend, editingMessageId = null, editingInitialContent = "", onSaveEdit, onCancelEdit }: MessageInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);


  //mention 
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ bottom: 0, left: 1 });

  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "@" || e.key === "2") {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setMentionPosition({
        bottom: rect.bottom + 6,
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
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Image, Highlight, Color, CharacterCount.configure({ limit: 5000 }), Placeholder.configure({ placeholder: "Write a message..." })],
    content: "",
    editorProps: {
      attributes: { class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[40px]" },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) insertImage(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files || []);
        files.forEach((file) => insertImage(file));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
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

  return (
    <div className="flex flex-col gap-2 w-full message-box">
      <div className="flex items-center gap-2 flex-wrap p-1">
        <ToolbarButton editor={editor} command="toggleBold" label="B" />
        <ToolbarButton editor={editor} command="toggleItalic" label="I" />
        <ToolbarButton editor={editor} command="toggleUnderline" label="U" />
        <ToolbarButton editor={editor} command="toggleBulletList" label={<FaListUl />} />
        <ToolbarButton editor={editor} command="toggleOrderedList" label={<FaListOl />} />
        <ToolbarButton editor={editor} command="toggleCode" label="<>" />
        <Button size="sm" onClick={insertLink}>Link</Button>

        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger>
            <Button size="sm">😊</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 z-[99999]">
            <Picker onEmojiSelect={addEmoji} />
          </PopoverContent>
        </Popover>

        <input type="file" multiple id="file-upload" className="hidden" onChange={handleFileChange} />
        {/* <label htmlFor="file-upload">
          <Button size="sm">📎</Button>
        </label> */}
        <ToolbarButton editor={editor} command="toggleFileUpload" label="📎" className="bg-red-500" />
        {/* When editing, show Update and Cancel buttons — otherwise show Send */}
        {editingMessageId ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSend}>Update</Button>
            <Button size="sm" variant="secondary" onClick={() => { onCancelEdit?.(); editor?.commands.clearContent(); setAttachedFiles([]); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="default" onClick={handleSend}>Send</Button>
        )}
      </div>

    <div className="border rounded-xl p-2 bg-white dark:bg-zinc-900 relative" ref={editorRef}>
  <div className="max-h-[200px] overflow-y-auto">
    <EditorContent editor={editor} />
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


      {attachedFiles.length > 0 && (
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
      )}
    </div>
  );
}

function ToolbarButton({ editor, command, label }: any) {
  if (!editor) return null;

  const isActive = editor.isActive(command.replace("toggle", "").toLowerCase());

  const run = () => {
    if (command === "toggleFileUpload") {
      window.dispatchEvent(new CustomEvent("toggleFileUpload"));
      return; // do not run editor command
    }

    editor.chain().focus()[command]().run();
  };

  return (
    <Button
      size="sm"
      variant={isActive ? "default" : "secondary"}
      onClick={run}
      className={isActive ? "bg-black text-white" : ""}
    >
      {label}
    </Button>
  );
}



