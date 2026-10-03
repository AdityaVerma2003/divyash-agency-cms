import Link from "next/link";

/**
 * Renders a Link when href is given, a plain div otherwise. A `Link | "div"`
 * union can't be used as a JSX tag because Link's href isn't optional.
 */
export function LinkOrDiv({
  href,
  className,
  children,
}: {
  href?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}
