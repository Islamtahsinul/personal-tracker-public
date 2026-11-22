"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Plus, Library, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrackerIcon } from "@/lib/icon-registry";
import { TrackerFormDialog } from "@/components/trackers/tracker-form-dialog";

export type SidebarTracker = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  count: number;
};

export function Sidebar({
  trackers,
  onNavigate,
  onCloseMobile,
}: {
  trackers: SidebarTracker[];
  /** Called after any nav link is clicked — lets the mobile drawer close itself. */
  onNavigate?: () => void;
  /** Renders a close (X) button, shown only inside the mobile drawer. */
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent/15">
            <Library className="size-4 text-accent" />
          </div>
          <span className="font-semibold">Personal Tracker</span>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="rounded-md p-1 text-muted hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 px-3" onClick={onNavigate}>
        <SidebarLink href="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
          Dashboard
        </SidebarLink>
        <SidebarLink href="/search" active={pathname === "/search"} icon={Search}>
          Search
        </SidebarLink>
      </nav>

      <div className="mt-6 flex items-center justify-between px-5">
        <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Trackers</span>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-md p-1 text-muted-2 hover:bg-white/10 hover:text-foreground"
          aria-label="New tracker"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <nav className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4" onClick={onNavigate}>
        {trackers.map((t) => {
          const Icon = getTrackerIcon(t.icon);
          const active = pathname === `/t/${t.slug}`;
          return (
            <Link
              key={t.id}
              href={`/t/${t.slug}`}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active ? "bg-white/8 text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${t.color}22`, color: t.color }}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="flex-1 truncate">{t.name}</span>
              {t.count > 0 && <span className="text-xs text-muted-2">{t.count}</span>}
            </Link>
          );
        })}
        {trackers.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-muted-2">No trackers yet — create one to get started.</p>
        )}
      </nav>

      <TrackerFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
