"use client";

import { cn } from "@/lib/utils";
import { ICON_CHOICES, ICON_REGISTRY } from "@/lib/icon-registry";

export const COLOR_PRESETS = [
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
];

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICON_CHOICES.map((key) => {
        const Icon = ICON_REGISTRY[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={`${key.replace(/-/g, " ")} icon`}
            aria-pressed={active}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border transition-colors",
              active ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={cn(
            "size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
            value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-foreground" : "hover:scale-110",
          )}
          aria-label={`Color ${c}`}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
        />
      ))}
    </div>
  );
}
