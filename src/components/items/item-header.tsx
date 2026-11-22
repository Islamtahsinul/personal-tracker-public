"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { EditItemDialog } from "@/components/items/edit-item-dialog";
import type { ItemWithValues, TrackerWithConfig } from "@/lib/types/domain";

export function ItemHeader({ item, tracker }: { item: ItemWithValues; tracker: TrackerWithConfig }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      {item.backdrop_url && (
        <div className="relative h-48 w-full sm:h-64">
          <ImageWithFallback
            src={item.backdrop_url}
            alt=""
            fallbackIconKey={tracker.icon}
            fallbackColor={tracker.color}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        </div>
      )}
      <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-end ${item.backdrop_url ? "-mt-16 sm:-mt-20" : ""}`}>
        <ImageWithFallback
          src={item.image_url}
          alt={item.title}
          fallbackIconKey={tracker.icon}
          fallbackColor={tracker.color}
          className="h-40 w-28 shrink-0 rounded-xl border-2 border-surface object-cover shadow-lg sm:h-48 sm:w-32"
        />
        <div className="flex flex-1 items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-2">{tracker.name}</p>
            <h1 className="text-2xl font-semibold">{item.title}</h1>
            {item.subtitle && <p className="mt-1 text-sm text-muted">{item.subtitle}</p>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <EditItemDialog open={editOpen} onClose={() => setEditOpen(false)} item={item} tracker={tracker} />
    </div>
  );
}
