import { cn } from "@/lib/utils";

export interface AvatarPerson {
  name: string;
  photoUrl?: string | null;
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  person,
  size = "sm",
  className,
  rounded = "full",
}: {
  person: AvatarPerson;
  size?: keyof typeof SIZES;
  className?: string;
  rounded?: "full" | "lg";
}) {
  const shape = rounded === "full" ? "rounded-full" : "rounded-lg";

  if (person.photoUrl) {
    return (
      <img
        src={person.photoUrl}
        alt={person.name}
        title={person.name}
        className={cn(SIZES[size], shape, "flex-shrink-0 object-cover", className)}
      />
    );
  }

  return (
    <span
      title={person.name}
      className={cn(
        SIZES[size],
        shape,
        "flex flex-shrink-0 items-center justify-center bg-brand-100 font-semibold uppercase text-brand-600 dark:bg-brand-500/20 dark:text-brand-300",
        className
      )}
    >
      {initials(person.name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "xs",
  className,
}: {
  people: AvatarPerson[];
  max?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((person, i) => (
        <Avatar
          key={`${person.name}-${i}`}
          person={person}
          size={size}
          className={cn("ring-2 ring-[var(--surface)]", i > 0 && "-ml-2")}
        />
      ))}
      {overflow > 0 && (
        <span
          title={people.slice(max).map((p) => p.name).join(", ")}
          className={cn(
            SIZES[size],
            "-ml-2 flex items-center justify-center rounded-full bg-brand-500/15 font-semibold text-brand-600 ring-2 ring-[var(--surface)] dark:text-brand-300"
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
