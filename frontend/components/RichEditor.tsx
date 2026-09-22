"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "react";

/* ── Toolbar button ───────────────────────────────────────────────────────── */
function TBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm
        transition-colors disabled:pointer-events-none disabled:opacity-30
        ${active
          ? "bg-coral-500 text-white"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px flex-shrink-0 bg-[var(--border)]" />;
}

/* ── Link dialog ──────────────────────────────────────────────────────────── */
function LinkDialog({
  editor, onClose,
}: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState(() => editor.getAttributes("link").href ?? "https://");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  function apply() {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim(), target: "_blank" }).run();
    }
    onClose();
  }

  function remove() {
    editor.chain().focus().unsetLink().run();
    onClose();
  }

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Insert link</p>
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); if (e.key === "Escape") onClose(); }}
        placeholder="https://example.com"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500"
      />
      <div className="mt-2.5 flex gap-2">
        <button onClick={apply} className="flex-1 rounded-lg bg-coral-500 py-1.5 text-xs font-semibold text-white hover:bg-coral-600">
          Apply
        </button>
        {editor.isActive("link") && (
          <button onClick={remove} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-danger hover:bg-red-50 dark:hover:bg-red-900/20">
            Remove
          </button>
        )}
        <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Image dialog ─────────────────────────────────────────────────────────── */
function ImageDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("https://");
  const [alt, setAlt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function apply() {
    if (!url.trim() || url === "https://") return onClose();
    editor.chain().focus().setImage({ src: url.trim(), alt }).run();
    onClose();
  }

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Insert image</p>
      <input ref={inputRef} type="url" value={url} onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); if (e.key === "Escape") onClose(); }}
        placeholder="https://example.com/image.jpg"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500 mb-2"
      />
      <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)}
        placeholder="Alt text (optional)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-coral-500"
      />
      <div className="mt-2.5 flex gap-2">
        <button onClick={apply} className="flex-1 rounded-lg bg-coral-500 py-1.5 text-xs font-semibold text-white hover:bg-coral-600">Insert</button>
        <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]">Cancel</button>
      </div>
    </div>
  );
}

/* ── Toolbar ──────────────────────────────────────────────────────────────── */
function Toolbar({ editor }: { editor: Editor }) {
  const [showLink, setShowLink]   = useState(false);
  const [showImage, setShowImage] = useState(false);
  const linkRef  = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Close dialogs on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (showLink  && linkRef.current  && !linkRef.current.contains(e.target as Node))  setShowLink(false);
      if (showImage && imageRef.current && !imageRef.current.contains(e.target as Node)) setShowImage(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showLink, showImage]);

  const can = editor.can().chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">

      {/* History */}
      <TBtn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!can.undo().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M3 13C5.33 7.67 10.17 5 15 5a9 9 0 0 1 9 9"/></svg>
      </TBtn>
      <TBtn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!can.redo().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 7v6h-6"/><path d="M21 13C18.67 7.67 13.83 5 9 5a9 9 0 0 0-9 9"/></svg>
      </TBtn>

      <Divider />

      {/* Headings */}
      <TBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <span className="text-[11px] font-bold">H1</span>
      </TBtn>
      <TBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="text-[11px] font-bold">H2</span>
      </TBtn>
      <TBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span className="text-[11px] font-bold">H3</span>
      </TBtn>

      <Divider />

      {/* Inline formatting */}
      <TBtn title="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
      </TBtn>
      <TBtn title="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </TBtn>
      <TBtn title="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
      </TBtn>
      <TBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M17.3 12H6.7"/><path d="M10 7.7C10.3 6.7 11.3 6 12.5 6c1.7 0 3 1.1 3 2.5s-1.3 2.5-3 2.5"/><path d="M14 16.3c-.3 1-1.3 1.7-2.5 1.7-1.7 0-3-1.1-3-2.5"/></svg>
      </TBtn>

      <Divider />

      {/* Code */}
      <TBtn title="Inline code (Ctrl+E)" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </TBtn>
      <TBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 10l-3 3 3 3"/><path d="M16 10l3 3-3 3"/></svg>
      </TBtn>

      <Divider />

      {/* Lists */}
      <TBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
      </TBtn>
      <TBtn title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </TBtn>
      <TBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </TBtn>

      <Divider />

      {/* Link */}
      <div ref={linkRef} className="relative">
        <TBtn title="Insert link (Ctrl+K)" active={editor.isActive("link")} onClick={() => { setShowImage(false); setShowLink((v) => !v); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </TBtn>
        {showLink && <LinkDialog editor={editor} onClose={() => setShowLink(false)} />}
      </div>

      {/* Image */}
      <div ref={imageRef} className="relative">
        <TBtn title="Insert image" onClick={() => { setShowLink(false); setShowImage((v) => !v); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </TBtn>
        {showImage && <ImageDialog editor={editor} onClose={() => setShowImage(false)} />}
      </div>

      <Divider />

      {/* Text align */}
      <TBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </TBtn>
      <TBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </TBtn>

      <Divider />

      {/* HR */}
      <TBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </TBtn>

      {/* Clear formatting */}
      <TBtn title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
      </TBtn>
    </div>
  );
}

/* ── Main editor ──────────────────────────────────────────────────────────── */
interface RichEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ initialContent, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "rich-code-block" } },
      }),
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "rich-link" } }),
      ImageExt.configure({ HTMLAttributes: { class: "rich-image" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing your post…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent ?? "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "tiptap-content" },
    },
    immediatelyRender: false,
  });

  // Sync when initialContent arrives late (async edit load)
  const synced = useRef(false);
  useEffect(() => {
    if (editor && initialContent && !synced.current) {
      synced.current = true;
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="rich-editor-wrap rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden focus-within:border-coral-500 transition-colors">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-wrapper" />
    </div>
  );
}
