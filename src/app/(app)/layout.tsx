import { getTrackers } from "@/lib/data/trackers";
import { getItemCountsByTracker } from "@/lib/data/items";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [trackers, counts] = await Promise.all([getTrackers(), getItemCountsByTracker()]);

  const sidebarTrackers = trackers.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    icon: t.icon,
    color: t.color,
    count: counts.get(t.id) ?? 0,
  }));

  return <AppShell trackers={sidebarTrackers}>{children}</AppShell>;
}
