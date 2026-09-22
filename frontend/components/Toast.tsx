"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type ToastKind = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

/* ── Context ───────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ── Single toast item ─────────────────────────────────────────────────── */
const KIND_STYLES: Record<ToastKind, { bar: string; icon: string; iconEl: string }> = {
  success: {
    bar: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    iconEl: "✓",
  },
  error: {
    bar: "bg-red-500",
    icon: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    iconEl: "✕",
  },
  warning: {
    bar: "bg-amber-500",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    iconEl: "!",
  },
  info: {
    bar: "bg-[#5B7CF7]",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    iconEl: "i",
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Mount → slide in
    const raf = requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 4 s
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  const s = KIND_STYLES[item.kind];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-black/10 dark:shadow-black/30 transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
      }`}
    >
      {/* Left colour bar */}
      <div className={`w-1 flex-shrink-0 ${s.bar}`} />

      <div className="flex flex-1 items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s.icon}`}>
          {s.iconEl}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--ink)] leading-snug">{item.title}</p>
          {item.message && (
            <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">{item.message}</p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => {
            clearTimeout(timerRef.current);
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 ml-1 text-[var(--muted)] hover:text-[var(--ink)] transition-colors text-sm leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── Provider ──────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, kind, title, message }]);
  }, []);

  const success = useCallback((t: string, m?: string) => toast("success", t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast("error", t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast("warning", t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast("info", t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Portal — bottom-right corner */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
