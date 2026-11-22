import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/utils";
import type { TrackerField } from "@/lib/types/domain";

export function FieldValueDisplay({ field, value }: { field: TrackerField; value: unknown }) {
  if (value == null || value === "") return <span className="text-muted-2">—</span>;

  switch (field.field_type) {
    case "date":
      return <span>{formatDate(value as string) ?? String(value)}</span>;
    case "datetime":
      return <span>{formatDate(value as string, { hour: "2-digit", minute: "2-digit" }) ?? String(value)}</span>;
    case "boolean":
      return <span>{value ? "Yes" : "No"}</span>;
    case "url":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          Link <ExternalLink className="size-3" />
        </a>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={value as string} alt="" className="h-20 w-auto rounded-md border border-border" />;
    case "rating":
      return <RatingStars value={value as number} readOnly />;
    case "multi_select":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(value as string[]).map((v) => {
            const opt = field.options.find((o) => o.label.toLowerCase() === v.toLowerCase() || o.value === v);
            return (
              <Badge key={v} color={opt?.color}>
                {opt?.label ?? v}
              </Badge>
            );
          })}
        </div>
      );
    case "select": {
      const opt = field.options.find((o) => o.value === value);
      return <Badge color={opt?.color}>{opt?.label ?? String(value)}</Badge>;
    }
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}
