import Link from "next/link";
import { Plus, Sparkles, Heart, Clock } from "lucide-react";
import { getTrackers } from "@/lib/data/trackers";
import { getItemCountsByTracker, getRecentItems, getFavoriteItems } from "@/lib/data/items";
import { getTrackerIcon } from "@/lib/icon-registry";
import { ItemCard } from "@/components/items/item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardCreateTrackerButton } from "@/components/trackers/dashboard-create-tracker-button";

export default async function DashboardPage() {
  const [trackers, counts, recent, favorites] = await Promise.all([
    getTrackers(),
    getItemCountsByTracker(),
    getRecentItems(10),
    getFavoriteItems(10),
  ]);

  const trackerById = new Map(trackers.map((t) => [t.id, t]));
  const totalItems = [...counts.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Library</h1>
          <p className="mt-1 text-sm text-muted">
            {totalItems} {totalItems === 1 ? "item" : "items"} across {trackers.length} {trackers.length === 1 ? "tracker" : "trackers"}
          </p>
        </div>
        <DashboardCreateTrackerButton />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Trackers</h2>
        {trackers.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No trackers yet"
            description="Create your first tracker — for movies, games, cars, or anything you're into."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trackers.map((t) => {
              const Icon = getTrackerIcon(t.icon);
              return (
                <Link
                  key={t.id}
                  href={`/t/${t.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${t.color}22`, color: t.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-2">{counts.get(t.id) ?? 0} items</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {favorites.length > 0 && (
        <ItemRow icon={Heart} title="Favourites" items={favorites} trackerById={trackerById} />
      )}

      {recent.length > 0 && (
        <ItemRow icon={Clock} title="Recently Added" items={recent} trackerById={trackerById} />
      )}

      {recent.length === 0 && trackers.length > 0 && (
        <EmptyState
          icon={Plus}
          title="Your library is empty"
          description="Open a tracker and add your first item — search external sources or enter details yourself."
        />
      )}
    </div>
  );
}

function ItemRow({
  icon: Icon,
  title,
  items,
  trackerById,
}: {
  icon: typeof Heart;
  title: string;
  items: Awaited<ReturnType<typeof getRecentItems>>;
  trackerById: Map<string, Awaited<ReturnType<typeof getTrackers>>[number]>;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted">
        <Icon className="size-4" />
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => {
          const tracker = trackerById.get(item.tracker_id);
          if (!tracker) return null;
          return (
            <ItemCard
              key={item.id}
              item={item}
              trackerIcon={tracker.icon}
              trackerColor={tracker.color}
              trackerName={tracker.name}
            />
          );
        })}
      </div>
    </section>
  );
}
