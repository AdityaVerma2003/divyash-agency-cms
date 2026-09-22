import PortalShell from "@/components/PortalShell";
import type { Role } from "@/types";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Services", href: "/admin/services" },
  { label: "Invoices", href: "/admin/invoices" },
  { label: "Contacts", href: "/admin/contacts" },
  { label: "Blog", href: "/admin/blog" },
  { label: "Billing", href: "/admin/billing", visibleTo: ["SUPER_ADMIN"] as Role[] },
  { label: "Notifications", href: "/admin/notifications", visibleTo: ["SUPER_ADMIN"] as Role[] },
  { label: "Team", href: "/admin/team", visibleTo: ["SUPER_ADMIN"] as Role[] },
  { label: "Audit Log", href: "/admin/audit-log", visibleTo: ["SUPER_ADMIN"] as Role[] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allowedRoles={["SUPER_ADMIN", "ACCOUNT_MANAGER"]} navItems={NAV_ITEMS}>
      {children}
    </PortalShell>
  );
}
