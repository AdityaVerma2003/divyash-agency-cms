"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchCurrentUser, logout, getAccessToken, homePathForRole } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import PageLoader from "@/components/PageLoader";
import CommandPalette, { type PaletteEntry } from "@/components/CommandPalette";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/portal/Avatar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AuthUser, Role, Notification } from "@/types";

export interface NavChild {
  label: string;
  href: string;
  visibleTo?: Role[];
  /** When true the shell renders the page's <h1> + breadcrumb; the page must not. */
  shellHeader?: boolean;
  subtitle?: string;
}

export interface NavItem extends NavChild {
  icon?: IconName;
  children?: NavChild[];
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

export type PortalVariant = "admin" | "client" | "workspace";

interface PortalShellProps {
  allowedRoles: Role[];
  navGroups: NavGroup[];
  children: React.ReactNode;
  variant?: PortalVariant;
  /** Shown in the header user menu; omit for portals with no profile page. */
  profileHref?: string;
}

const VARIANT_LABEL: Record<PortalVariant, string> = {
  admin: "Agency portal",
  client: "Client portal",
  workspace: "Workspace",
};

const COLLAPSE_KEY = "portal-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function humanRole(role: Role) {
  return role.toLowerCase().replace(/_/g, " ");
}

/* ── One sidebar row (with optional collapsible children) ──────────────────── */
function NavRow({
  item,
  collapsed,
  role,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const children = (item.children ?? []).filter((c) => !c.visibleTo || c.visibleTo.includes(role));
  const hasChildren = children.length > 0;
  const childActive = children.some((c) => isActive(pathname, c.href));
  const selfActive = isActive(pathname, item.href);
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const rowCls = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      collapsed && "justify-center px-0",
      active
        ? "bg-[var(--surface-3)] text-[var(--ink)]"
        : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
    );

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => (collapsed ? undefined : setOpen((o) => !o))}
          className={rowCls(selfActive || childActive)}
          aria-expanded={open}
        >
          {item.icon && (
            <Icon
              name={item.icon}
              className={cn(
                "flex-shrink-0",
                selfActive || childActive ? "text-[var(--portal-accent)]" : "text-[var(--muted)]"
              )}
            />
          )}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <Icon
                name="chevronDown"
                size={16}
                className={cn("flex-shrink-0 text-[var(--muted)] transition-transform", open && "rotate-180")}
              />
            </>
          )}
        </button>

        {open && !collapsed && (
          <div className="mt-1 space-y-1 pl-[2.125rem]">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(pathname, child.href)
                    ? "bg-[var(--surface-3)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} className={rowCls(selfActive)}>
      {item.icon && (
        <Icon
          name={item.icon}
          className={cn("flex-shrink-0", selfActive ? "text-[var(--portal-accent)]" : "text-[var(--muted)]")}
        />
      )}
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}

export default function PortalShell({
  allowedRoles,
  navGroups,
  children,
  variant = "admin",
  profileHref,
}: PortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const accent = variant === "workspace" ? "#2DBFA0" : "#6366F1";

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    fetchCurrentUser().then((current) => {
      if (!current) {
        router.replace("/login");
        return;
      }
      if (!allowedRoles.includes(current.role)) {
        // Logged in, just in the wrong portal — send them home rather than
        // bouncing to /login (e.g. a team member hitting /admin/* directly).
        router.replace(homePathForRole(current.role));
        return;
      }
      // Team members must finish onboarding first; super admins skip it
      if (current.role === "ACCOUNT_MANAGER" && current.onboardingStatus !== "COMPLETE") {
        router.replace("/team/complete-profile");
        return;
      }
      setUser(current);
      setChecking(false);
      api.get<Notification[]>("/notifications", getAccessToken()).then(setNotifications).catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    if (!bellOpen && !userMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      if (bellOpen && !target.closest?.("[data-bell]")) setBellOpen(false);
      if (userMenuOpen && !target.closest?.("[data-user-menu]")) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [bellOpen, userMenuOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setBellOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function markRead(id: string, link?: string | null) {
    api.patch(`/notifications/${id}/read`, {}, getAccessToken()).catch(() => undefined);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setBellOpen(false);
    if (link) router.push(link);
  }

  function markAllRead() {
    api.patch("/notifications/read-all", {}, getAccessToken()).catch(() => undefined);
    // Flip the flag — don't discard the list, the user still wants to read them
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (checking || !user) {
    return (
      <div className="portal-theme" style={{ ["--portal-accent" as string]: accent }}>
        <PageLoader />
      </div>
    );
  }

  const role = user.role;
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.visibleTo || item.visibleTo.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  // Flatten for the palette, title row and breadcrumb
  const flatEntries: { label: string; href: string; group?: string; icon?: IconName; parent?: string; shellHeader?: boolean; subtitle?: string }[] = [];
  for (const group of visibleGroups) {
    for (const item of group.items) {
      // A parent with children isn't its own destination (and often shares an
      // href with its first child), so only its children are listed.
      if (!item.children?.length) {
        flatEntries.push({
          label: item.label,
          href: item.href,
          group: group.heading,
          icon: item.icon,
          shellHeader: item.shellHeader,
          subtitle: item.subtitle,
        });
      }
      for (const child of item.children ?? []) {
        if (child.visibleTo && !child.visibleTo.includes(role)) continue;
        flatEntries.push({
          label: child.label,
          href: child.href,
          group: group.heading,
          icon: item.icon,
          parent: item.label,
          shellHeader: child.shellHeader,
          subtitle: child.subtitle,
        });
      }
    }
  }

  // Deepest matching entry wins, so /admin/tasks/list beats /admin/tasks
  const activeEntry = flatEntries
    .filter((e) => isActive(pathname, e.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const paletteEntries: PaletteEntry[] = flatEntries.map((e) => ({
    label: e.parent ? `${e.parent} › ${e.label}` : e.label,
    href: e.href,
    group: e.group,
    icon: e.icon,
  }));

  const sidebarInner = (mobile: boolean) => (
    <>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 pt-6", collapsed && !mobile && "justify-center px-0")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/divyash-logo-everywhere.png"
          alt="Divyash Digital"
          className="h-9 w-auto flex-shrink-0 object-contain"
        />
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-[var(--ink)]">Divyash Digital</p>
            <p className="mt-0.5 text-[11px] leading-tight text-[var(--muted)]">{VARIANT_LABEL[variant]}</p>
          </div>
        )}
        {!mobile && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex-shrink-0 rounded-md p-1.5 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name="sidebar" size={18} />
          </button>
        )}
      </div>

      <nav className={cn("mt-7 flex-1 space-y-6 overflow-y-auto px-4 pb-6", collapsed && !mobile && "px-3")}>
        {visibleGroups.map((group, gi) => (
          <div key={group.heading ?? gi}>
            {group.heading && (!collapsed || mobile) && (
              <p className="mb-3 px-3 text-xs uppercase tracking-wide text-[var(--muted)]">{group.heading}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  collapsed={collapsed && !mobile}
                  role={role}
                  onNavigate={mobile ? () => setDrawerOpen(false) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  const headerButtonCls =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] shadow-portal-xs transition-colors hover:text-[var(--ink)]";

  return (
    <div
      className="portal-theme flex h-screen overflow-hidden"
      style={{ ["--portal-accent" as string]: accent }}
    >
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-[76px]" : "w-[270px]"
        )}
      >
        {sidebarInner(false)}
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 ease-in-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigation drawer"
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-5 rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
          aria-label="Close menu"
        >
          <Icon name="close" size={18} />
        </button>
        {sidebarInner(true)}
      </div>

      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--header-bg)] px-3 py-3 lg:px-5">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-[var(--ink-2)] hover:text-[var(--ink)] lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>

          {/* ⌘K search trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:max-w-xs"
          >
            <Icon name="search" size={18} className="flex-shrink-0" />
            <span className="flex-1 truncate text-left">Search pages…</span>
            <kbd className="hidden flex-shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-medium sm:block">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex flex-shrink-0 items-center gap-2.5">
            <ThemeToggle className={headerButtonCls} />

            {/* Bell */}
            <div data-bell className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className={cn(headerButtonCls, "relative")}
                aria-label="Notifications"
              >
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-portal-lg">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-[var(--portal-accent)]">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">No notifications</p>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id, n.link)}
                          className={cn(
                            "w-full border-b border-[var(--border-subtle)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--surface-2)]",
                            n.isRead && "opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                                n.isRead ? "bg-transparent" : "bg-[var(--portal-accent)]"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs leading-snug text-[var(--ink)]">{n.message}</p>
                              <p className="mt-0.5 text-[10px] text-[var(--muted)]">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {variant === "admin" && (
                    <div className="border-t border-[var(--border)] px-4 py-2.5">
                      <button
                        onClick={() => {
                          setBellOpen(false);
                          router.push("/admin/notifications");
                        }}
                        className="w-full text-center text-xs font-medium text-[var(--portal-accent)]"
                      >
                        View all notifications →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User menu */}
            <div data-user-menu className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-lg p-0.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar person={{ name: user.name, photoUrl: user.photoUrl }} size="md" rounded="lg" />
                <span className="hidden text-sm font-medium text-[var(--ink)] sm:block">{user.name}</span>
                <Icon name="chevronDown" size={16} className="hidden text-[var(--muted)] sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-portal-lg">
                  <div className="border-b border-[var(--border)] px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{user.name}</p>
                    <p className="truncate text-xs capitalize text-[var(--muted)]">{humanRole(role)}</p>
                  </div>
                  {profileHref && (
                    <Link
                      href={profileHref}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <Icon name="profile" size={18} className="text-[var(--muted)]" />
                      My profile
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  >
                    <Icon name="logout" size={18} className="text-[var(--muted)]" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1536px] px-3 pb-10 pt-6 lg:px-5">
            {activeEntry?.shellHeader && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <h1 className="mb-1 text-[28px] font-medium leading-8 text-[var(--ink)]">
                    {activeEntry.label}
                  </h1>
                  {activeEntry.subtitle && (
                    <p className="text-sm leading-5 text-[var(--muted)]">{activeEntry.subtitle}</p>
                  )}
                </div>
                {!activeEntry.subtitle && (
                  <ol className="flex items-center gap-2 text-sm font-medium">
                    <li className="text-[var(--muted)]">Home</li>
                    {activeEntry.parent && (
                      <>
                        <li className="text-[var(--muted)]" aria-hidden>/</li>
                        <li className="text-[var(--muted)]">{activeEntry.parent}</li>
                      </>
                    )}
                    <li className="text-[var(--muted)]" aria-hidden>/</li>
                    <li className="text-[var(--ink)]">{activeEntry.label}</li>
                  </ol>
                )}
              </div>
            )}
            <ToastProvider>{children}</ToastProvider>
          </div>
        </main>
      </div>

      <CommandPalette entries={paletteEntries} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
