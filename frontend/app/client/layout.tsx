import PortalShell from "@/components/PortalShell";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/client/dashboard" },
  { label: "Invoices", href: "/client/invoices" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allowedRoles={["CLIENT"]} navItems={NAV_ITEMS}>
      {children}
    </PortalShell>
  );
}
