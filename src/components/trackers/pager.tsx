import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pager({
  page,
  pageSize,
  totalCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <p className="text-xs text-muted-2">
        {from}–{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <PagerLink href={hrefFor(page - 1)} disabled={page <= 1} label="Previous">
          <ChevronLeft className="size-4" />
        </PagerLink>
        <span className="text-xs text-muted">
          Page {page} of {totalPages}
        </span>
        <PagerLink href={hrefFor(page + 1)} disabled={page >= totalPages} label="Next">
          <ChevronRight className="size-4" />
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "flex size-8 items-center justify-center rounded-lg border transition-colors",
    disabled ? "border-border text-muted-2 pointer-events-none opacity-40" : "border-border bg-surface-2 text-muted hover:text-foreground",
  );
  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}
