"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils";
import type { TrackerField } from "@/lib/types/domain";

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TrackerField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.field_type) {
    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.help_text ?? undefined}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          step={1}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );

    case "decimal":
      return (
        <Input
          type="number"
          step="any"
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={(value as string)?.slice(0, 10) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={value ? String(value).slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "url":
      return (
        <Input
          type="url"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      );

    case "image":
      return (
        <div className="space-y-2">
          <Input
            type="url"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
          />
          {!!value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value as string} alt="" className="h-24 w-auto rounded-md border border-border object-cover" />
          )}
        </div>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 rounded border-border-strong accent-[var(--accent)]"
          />
          Yes
        </label>
      );

    case "select":
      return (
        <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.id} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );

    case "multi_select":
      return <MultiSelectInput field={field} value={(value as string[]) ?? []} onChange={onChange} />;

    case "rating":
      return <RatingStars value={(value as number) ?? null} onChange={onChange} />;

    case "text":
    default:
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.help_text ?? undefined}
        />
      );
  }
}

function MultiSelectInput({
  field,
  value,
  onChange,
}: {
  field: TrackerField;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const remaining = field.options.filter((o) => !value.some((v) => v.toLowerCase() === o.label.toLowerCase()));

  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed || value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="text-muted-2 hover:text-foreground"
              aria-label={`Remove ${v}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type and press Enter to add…"
      />
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.slice(0, 12).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => add(o.label)}
              className={cn(
                "rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent",
              )}
            >
              + {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
