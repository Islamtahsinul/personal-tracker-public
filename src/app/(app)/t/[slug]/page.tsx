import { notFound } from "next/navigation";
import { getTrackerWithConfig } from "@/lib/data/trackers";
import { getItemsForTracker, type ItemListFilters } from "@/lib/data/items";
import { getTrackerIcon, TrackerIconBadge } from "@/lib/icon-registry";
import { ItemCard } from "@/components/items/item-card";
import { TrackerToolbar } from "@/components/trackers/tracker-toolbar";
import { Pager } from "@/components/trackers/pager";
import { EmptyState } from "@/components/ui/empty-state";
import { Library } from "lucide-react";

export default async function TrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const tracker = await getTrackerWithConfig(slug);
  if (!tracker) notFound();

  const filters: ItemListFilters = {
    search: sp.q,
    statusId: sp.status || null,
    favoritesOnly: sp.fav === "1",
    sort: (sp.sort as ItemListFilters["sort"]) || "recently_added",
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : 1,
  };

  const { items, totalCount, page, pageSize } = await getItemsForTracker(tracker.id, filters);
  const Icon = getTrackerIcon(tracker.icon);
  const hasActiveFilters = !!(sp.q || sp.status || sp.fav);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <TrackerIconBadge icon={tracker.icon} color={tracker.color} />
        <div>
          <h1 className="text-xl font-semibold">{tracker.name}</h1>
          {tracker.description && <p className="text-sm text-muted">{tracker.description}</p>}
        </div>
      </div>

      <TrackerToolbar tracker={tracker} />

      {items.length === 0 ? (
        <EmptyState
          icon={hasActiveFilters ? Icon : Library}
          title={hasActiveFilters ? "No items match your filters" : `No items in ${tracker.name} yet`}
          description={
            hasActiveFilters
              ? "Try clearing search or filters."
              : "Click “Add Item” to search for something automatically, or enter it manually."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} trackerIcon={tracker.icon} trackerColor={tracker.color} />
            ))}
          </div>
          <Pager page={page} pageSize={pageSize} totalCount={totalCount} basePath={`/t/${tracker.slug}`} searchParams={sp} />
        </>
      )}
    </div>
  );
}
