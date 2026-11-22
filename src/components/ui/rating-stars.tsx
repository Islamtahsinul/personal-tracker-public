"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rating is stored 0-10 (half-point precision) but displayed as 5 stars. */
export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const starPx = { sm: "size-3.5", md: "size-5", lg: "size-6" }[size];
  const displayValue = (hover ?? value ?? 0) / 2;

  if (readOnly && value == null) {
    return <span className="text-sm text-muted-2">Not rated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
        role={readOnly ? undefined : "group"}
        aria-label={readOnly ? undefined : "Rating"}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const starIndex = i + 1;
          const fill = Math.min(1, Math.max(0, displayValue - i));

          function valueFromPointer(e: { currentTarget: HTMLButtonElement; clientX: number }) {
            const rect = e.currentTarget.getBoundingClientRect();
            const half = e.clientX - rect.left < rect.width / 2;
            return (starIndex - (half ? 0.5 : 0)) * 2;
          }

          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              aria-label={`Rate ${starIndex} star${starIndex === 1 ? "" : "s"}`}
              aria-pressed={value != null && value >= starIndex * 2}
              className={cn("relative", !readOnly && "cursor-pointer")}
              onMouseMove={(e) => {
                if (readOnly) return;
                setHover(valueFromPointer(e));
              }}
              onClick={(e) => {
                if (readOnly || !onChange) return;
                // A keyboard-triggered click (Enter/Space) has event.detail === 0 (no real
                // pointer position) — treat that as "set this whole star" rather than running
                // it through pointer-position math that would compute a bogus half-star value.
                const next = e.detail === 0 ? starIndex * 2 : valueFromPointer(e);
                onChange(next === value ? null : next);
              }}
            >
              <Star className={cn(starPx, "text-muted-2")} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(starPx, "fill-amber-400 text-amber-400")} />
              </span>
            </button>
          );
        })}
      </div>
      {value != null && <span className="text-sm font-medium text-muted">{(value / 2).toFixed(1)}/5</span>}
    </div>
  );
}
