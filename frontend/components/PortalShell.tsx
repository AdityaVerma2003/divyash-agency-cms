"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchCurrentUser, logout, getAccessToken } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import { api } from "@/lib/api";
import type { AuthUser, Role, Notification } from "@/types";

interface NavItem {
  label: string;
  href: string;
  visibleTo?: Role[]; // if set, only shown to users whose role is in this list
}

interface PortalShellProps {
  allowedRoles: Role[];
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function PortalShell({ allowedRoles, navItems, children }: PortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchCurrentUser().then((current) => {
      if (!current || !allowedRoles.includes(current.role)) {
        router.replace("/login");
        return;
      }
      setUser(current);
      setChecking(false);
      // Load notifications after auth confirmed
      api.get<Notification[]>("/notifications", getAccessToken()).then(setNotifications).catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close bell on outside click — use data attribute so multiple bell instances don't conflict
  useEffect(() => {
    if (!bellOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!(e.target as Element).closest?.("[data-bell]")) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [bellOpen]);

  function markRead(id: string, link?: string | null) {
    // Fire-and-forget — don't await; update UI and navigate immediately
    api.patch(`/notifications/${id}/read`, {}, getAccessToken()).catch(() => undefined);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setBellOpen(false);
    if (link) router.push(link);
  }

  function markAllRead() {
    // Fire-and-forget
    api.patch("/notifications/read-all", {}, getAccessToken()).catch(() => undefined);
    setNotifications([]);
    setBellOpen(false);
  }

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Trap focus / close on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-coral-500 animate-pulse" />
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const isPortalClient = user.role === "CLIENT";

  /* ── Notification bell ───────────────────────────────────────────────── */
  function BellButton({ align = "right", openUp = false }: { align?: "left" | "right"; openUp?: boolean; }) {
    function timeAgo(iso: string) {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return "just now";
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    }

    return (
      <div data-bell className="relative flex-shrink-0">
        <button
          onClick={() => setBellOpen((o) => !o)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className={`absolute z-50 w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/10 dark:shadow-black/40 ${openUp ? "bottom-full mb-2" : "top-10"} ${align === "left" ? "left-0" : "right-0"}`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--ink)]">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-coral-500 hover:text-coral-600 font-medium transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">No new notifications</p>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id, n.link)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-2)] ${n.isRead ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${!n.isRead ? "bg-coral-500" : "bg-transparent"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--ink)] leading-snug line-clamp-2">{n.message}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <p className="text-[10px] text-[var(--muted)]">{timeAgo(n.createdAt)}</p>
                          {n.link && <span className="text-[10px] text-coral-500">→ view</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {!isPortalClient && (
              <div className="border-t border-[var(--border)] px-4 py-2.5">
                <button
                  onClick={() => { setBellOpen(false); router.push("/admin/notifications"); }}
                  className="w-full text-center text-xs font-medium text-coral-500 hover:text-coral-600 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Shared nav content (used in both desktop sidebar and mobile drawer) ── */
  function NavContent({ onLinkClick, showBell = false }: { onLinkClick?: () => void; showBell?: boolean }) {
    return (
      <>
        {/* Wordmark */}
        <div className="mb-8 px-3 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            alt="Divyash Digital"
            className="h-8 w-8 flex-shrink-0 object-contain"
          />
          <div>
            <p className="text-sm font-semibold tracking-tight text-white leading-tight">
              Divyash Digital
            </p>
            <p className="text-[10px] text-white/40 leading-tight">
              {isPortalClient ? "Client portal" : "Agency portal"}
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.filter((item) => !item.visibleTo || item.visibleTo.includes(user!.role)).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center rounded-lg border-l-2 py-2.5 pl-[10px] pr-3 text-sm transition-colors motion-reduce:transition-none ${
                  active
                    ? "border-coral-500 bg-white/[0.08] font-semibold text-white"
                    : "border-transparent text-white/50 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + theme + bell + sign out */}
        <div className="border-t border-white/[0.08] pt-4 space-y-2">
          <div className="px-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user!.name}</p>
              <p className="text-[10px] text-white/40 capitalize">
                {user!.role.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {showBell && <BellButton align="left" openUp />}
              <ThemeToggle className="border-white/10 bg-white/[0.06] text-white/40 hover:border-coral-500 hover:text-coral-400" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-white/40 transition-all hover:border-coral-500/40 hover:bg-coral-500/[0.07] hover:text-coral-400 motion-reduce:transition-none"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-[#1B1830] px-3 py-5 border-r border-white/[0.06]">
        <NavContent showBell />
      </aside>

      {/* ── Mobile overlay + drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        /* Backdrop */
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#1B1830] px-3 py-5 border-r border-white/[0.06] transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation drawer"
      >
        {/* Close button */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <NavContent onLinkClick={() => setDrawerOpen(false)} />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#1B1830] px-4 lg:hidden">
          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white/50 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Logo + brand */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Divyash Digital"
              className="h-7 w-7 flex-shrink-0 object-contain"
            />
            <p className="text-sm font-semibold text-white truncate">Divyash Digital</p>
          </div>

          {/* Current page label */}
          <p className="hidden sm:block text-xs text-white/40 truncate flex-shrink-0">
            {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? ""}
          </p>

          <BellButton />
          <ThemeToggle className="border-white/10 bg-white/[0.06] text-white/40 hover:border-coral-500 hover:text-coral-400 flex-shrink-0" />
        </header>

        {/* ── Page content ───────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto bg-[var(--page-bg)] p-4 lg:p-6">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}
