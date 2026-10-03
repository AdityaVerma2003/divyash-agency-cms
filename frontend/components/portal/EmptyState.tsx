import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      {icon && <div className="mb-3 text-[var(--muted)]">{icon}</div>}
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[var(--muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
