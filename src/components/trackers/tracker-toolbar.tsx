"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Heart, Plus, Settings } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/items/add-item-dialog";
import type { TrackerWithConfig } from "@/lib/types/domain";
import Link from "next/link";

export function TrackerToolbar({ tracker }: { tracker: TrackerWithConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("q", q || null)}
            onBlur={() => updateParam("q", q || null)}
            placeholder={`Search ${tracker.name.toLowerCase()}…`}
            className="pl-9"
          />
        </div>

        <Select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value || null)}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {tracker.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select value={searchParams.get("sort") ?? ""} onChange={(e) => updateParam("sort", e.target.value || null)} className="w-auto">
          <option value="">Recently added</option>
          <option value="recently_updated">Recently updated</option>
          <option value="title_asc">Title (A–Z)</option>
          <option value="title_desc">Title (Z–A)</option>
          <option value="rating_desc">Highest rated</option>
        </Select>

        <button
          onClick={() => updateParam("fav", searchParams.get("fav") ? null : "1")}
          aria-pressed={!!searchParams.get("fav")}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
            searchParams.get("fav")
              ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
              : "border-border bg-surface-2 text-muted hover:text-foreground",
          )}
        >
          <Heart className={cn("size-3.5", searchParams.get("fav") && "fill-rose-500")} />
          Favourites
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/t/${tracker.slug}/settings`}>
          <Button variant="secondary" size="icon" aria-label="Tracker settings">
            <Settings className="size-4" />
          </Button>
        </Link>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      <AddItemDialog open={addOpen} onClose={() => setAddOpen(false)} tracker={tracker} />
    </div>
  );
}
