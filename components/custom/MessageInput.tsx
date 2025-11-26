"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Picker from "@emoji-mart/react";

interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link, Image],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  const handleSend = () => {
    if (!editor) return;
    const html = editor.getHTML();
    if ((!html || html === "<p></p>") && attachedFiles.length === 0) return;

    onSend(html, attachedFiles);
    editor.commands.clearContent();
    setAttachedFiles([]);
  };

  const addEmoji = (emoji: any) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji.native).run();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setAttachedFiles([...attachedFiles, ...Array.from(e.target.files)]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const insertImage = (file: File) => {
    const url = URL.createObjectURL(file);
    editor?.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-col gap-2 w-full message-box">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Button size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>B</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleCode().run()}>{"<>"}</Button>
        <Button size="sm" onClick={() => {
          const url = prompt("Enter URL");
          if (url) editor?.chain().focus().setLink({ href: url }).run();
        }}>Link</Button>

        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger>
            <Button size="sm">😊</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <Picker onEmojiSelect={addEmoji} />
          </PopoverContent>
        </Popover>

        {/* File Upload */}
        <input
          type="file"
          multiple
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload">
          <Button size="sm">📎 Attach</Button>
        </label>

        <Button size="sm" onClick={handleSend}>Send</Button>
      </div>

      {/* Editor */}
      <div className="border rounded-xl p-2 min-h-[50px] bg-white dark:bg-zinc-900">
        <EditorContent editor={editor} />
      </div>

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1 border p-1 rounded">
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-red-500 font-bold">x</button>
              {file.type.startsWith("image/") && (
                <button onClick={() => insertImage(file)} className="text-blue-500 ml-1">Insert</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
