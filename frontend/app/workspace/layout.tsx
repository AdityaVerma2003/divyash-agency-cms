import PortalShell, { type NavGroup } from "@/components/PortalShell";

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Main menu",
    items: [
      {
        label: "Dashboard",
        href: "/workspace/dashboard",
        icon: "dashboard",
        shellHeader: true,
        subtitle: "Your assigned clients, reports due, and open tasks.",
      },
      { label: "My Clients", href: "/workspace/clients", icon: "clients", shellHeader: true },
      { label: "My Reports", href: "/workspace/my-reports", icon: "reporting", shellHeader: true },
      { label: "Tasks", href: "/workspace/tasks", icon: "tasks", shellHeader: true },
    ],
  },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      allowedRoles={["ACCOUNT_MANAGER", "SUPER_ADMIN"]}
      navGroups={NAV_GROUPS}
      variant="workspace"
      profileHref="/workspace/profile"
    >
      {children}
    </PortalShell>
  );
}
