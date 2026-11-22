import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import type { ItemWithValues } from "@/lib/types/domain";

export function ItemCard({
  item,
  trackerIcon,
  trackerColor,
  trackerName,
}: {
  item: ItemWithValues;
  trackerIcon: string;
  trackerColor: string;
  trackerName?: string;
}) {
  return (
    <Link
      href={`/i/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-border-strong hover:shadow-lg hover:shadow-black/20"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-2">
        <ImageWithFallback
          src={item.image_url}
          alt={item.title}
          fallbackIconKey={trackerIcon}
          fallbackColor={trackerColor}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.is_favorite && (
          <div className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <Heart className="size-3.5 fill-rose-500 text-rose-500" />
          </div>
        )}
        {item.status && (
          <div className="absolute bottom-2 left-2">
            <Badge color={item.status.color}>{item.status.label}</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {trackerName && <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">{trackerName}</span>}
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-1">
          {item.subtitle ? <span className="truncate text-xs text-muted">{item.subtitle}</span> : <span />}
          {item.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {(item.rating / 2).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
