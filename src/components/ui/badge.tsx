import { cn } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
  variant = "soft",
}: {
  children: React.ReactNode;
  color?: string | null;
  className?: string;
  variant?: "soft" | "outline";
}) {
  const style = color
    ? variant === "soft"
      ? { backgroundColor: `${color}22`, color, borderColor: `${color}33` }
      : { borderColor: `${color}55`, color }
    : undefined;

  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        !color && "bg-surface-2 border-border text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
