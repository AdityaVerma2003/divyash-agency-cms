"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface PaletteEntry {
  label: string;
  href: string;
  group?: string;
  icon?: IconName;
}

/** Subsequence match, so "invs" finds "Invoices". */
function fuzzyMatch(query: string, text: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let i = 0;
  for (const char of t) {
    if (char === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

export default function CommandPalette({
  entries,
  open,
  onOpenChange,
}: {
  entries: PaletteEntry[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      onOpenChange(!open);
    },
    { enableOnFormTags: true }
  );

  const results = useMemo(
    () => entries.filter((e) => fuzzyMatch(query, `${e.group ?? ""} ${e.label}`)),
    [entries, query]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // focus after the dialog paints
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[cursor];
      if (target) go(target.href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search pages"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-portal-lg">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
          <Icon name="search" size={18} className="flex-shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages…"
            className="h-12 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">
              No pages match “{query}”
            </p>
          ) : (
            results.map((entry, i) => (
              <button
                key={`${entry.href}-${entry.label}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(entry.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  i === cursor
                    ? "bg-[var(--surface-3)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                )}
              >
                {entry.icon && (
                  <Icon name={entry.icon} size={18} className="flex-shrink-0 text-[var(--muted)]" />
                )}
                <span className="flex-1 font-medium">{entry.label}</span>
                {entry.group && (
                  <span className="text-xs text-[var(--muted)]">{entry.group}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
