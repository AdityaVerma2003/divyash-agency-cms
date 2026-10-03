import PortalShell, { type NavGroup } from "@/components/PortalShell";

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Main menu",
    items: [
      {
        label: "Dashboard",
        href: "/client/dashboard",
        icon: "dashboard",
        shellHeader: true,
        subtitle: "Your services, performance and invoices at a glance.",
      },
      { label: "Tasks", href: "/client/tasks", icon: "tasks", shellHeader: true },
      { label: "Invoices", href: "/client/invoices", icon: "invoices" },
    ],
  },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allowedRoles={["CLIENT"]} navGroups={NAV_GROUPS} variant="client">
      {children}
    </PortalShell>
  );
}
