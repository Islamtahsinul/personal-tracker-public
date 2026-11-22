import { Search as SearchIcon } from "lucide-react";
import { searchAllItems } from "@/lib/data/items";
import { getTrackers } from "@/lib/data/trackers";
import { ItemCard } from "@/components/items/item-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState icon={SearchIcon} title="Search your library" description="Find anything across every tracker by title." />
      </div>
    );
  }

  const [items, trackers] = await Promise.all([searchAllItems(query), getTrackers(true)]);
  const trackerById = new Map(trackers.map((t) => [t.id, t]));

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const arr = grouped.get(item.tracker_id) ?? [];
    arr.push(item);
    grouped.set(item.tracker_id, arr);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Search results for &quot;{query}&quot;</h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} {items.length === 1 ? "match" : "matches"}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No matches" description="Try a different term, or check spelling." />
      ) : (
        [...grouped.entries()].map(([trackerId, groupItems]) => {
          const tracker = trackerById.get(trackerId);
          if (!tracker) return null;
          return (
            <section key={trackerId}>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                {tracker.name} <span className="text-muted-2">({groupItems.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {groupItems.map((item) => (
                  <ItemCard key={item.id} item={item} trackerIcon={tracker.icon} trackerColor={tracker.color} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
