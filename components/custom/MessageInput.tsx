"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Picker from "@emoji-mart/react";
interface MessageInputProps {
  onSend: (content: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none",
      },
    },
    // THIS fixes SSR warning
    immediatelyRender: false,
  });

  const [showEmoji, setShowEmoji] = useState(false);

  const handleSend = () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (!html || html === "<p></p>") return;
    onSend(html);
    editor.commands.clearContent();
  };

  const addEmoji = (emoji: any) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji.native).run();
  };

  return (
    <div className="flex flex-col gap-2 w-full message-box">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <Button size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>B</Button>
        <Button size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</Button>

        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger>
            <Button size="sm">😊</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
  <Picker onEmojiSelect={addEmoji} />
          </PopoverContent>
        </Popover>

        <Button size="sm" onClick={handleSend}>Send</Button>
      </div>

      {/* Editor */}
      <div className="border rounded-full p-2 min-h-[40px] bg-white dark:bg-zinc-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
