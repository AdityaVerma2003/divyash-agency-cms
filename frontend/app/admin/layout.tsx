import PortalShell, { type NavGroup } from "@/components/PortalShell";
import type { Role } from "@/types";

const SUPER: Role[] = ["SUPER_ADMIN"];

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Main menu",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: "dashboard",
        shellHeader: true,
        subtitle: "Analyse trends, track growth, and make data-driven decisions.",
      },
      { label: "Calendar", href: "/admin/calendar", icon: "calendar", shellHeader: true },
      {
        label: "Tasks",
        href: "/admin/tasks",
        icon: "tasks",
        children: [
          { label: "Kanban", href: "/admin/tasks", shellHeader: true },
          { label: "List", href: "/admin/tasks/list", shellHeader: true },
        ],
      },
      { label: "Clients", href: "/admin/clients", icon: "clients" },
      { label: "Reporting", href: "/admin/reporting", icon: "reporting" },
      { label: "Services", href: "/admin/services", icon: "services" },
    ],
  },
  {
    heading: "Billing",
    items: [
      { label: "Invoices", href: "/admin/invoices", icon: "invoices" },
      { label: "Billing", href: "/admin/billing", icon: "billing", visibleTo: SUPER },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Blog", href: "/admin/blog", icon: "blog" },
      { label: "Case Studies", href: "/admin/case-studies", icon: "caseStudies" },
      { label: "Contacts", href: "/admin/contacts", icon: "contacts" },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Team", href: "/admin/team", icon: "team", visibleTo: SUPER },
      { label: "Notifications", href: "/admin/notifications", icon: "bell", visibleTo: SUPER },
      { label: "Audit Log", href: "/admin/audit-log", icon: "auditLog", visibleTo: SUPER },
      {
        label: "Maintenance",
        href: "/admin/maintenance",
        icon: "maintenance",
        visibleTo: SUPER,
        shellHeader: true,
      },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      // Team members live in /workspace now — the backend enforces this too
      // (see CLAUDE.md's authorization matrix), this is just the matching UI gate.
      allowedRoles={["SUPER_ADMIN"]}
      navGroups={NAV_GROUPS}
      variant="admin"
      profileHref="/admin/profile"
    >
      {children}
    </PortalShell>
  );
}
