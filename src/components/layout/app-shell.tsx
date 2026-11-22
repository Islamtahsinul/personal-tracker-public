"use client";

import { useState, Suspense } from "react";
import { Menu } from "lucide-react";
import { Sidebar, type SidebarTracker } from "./sidebar";
import { GlobalSearchBar } from "./global-search-bar";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ trackers, children }: { trackers: SidebarTracker[]; children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: sidebar sits statically in normal flow. */}
      <div className="hidden lg:block">
        <Sidebar trackers={trackers} />
      </div>

      {/* Mobile: sidebar becomes a slide-in drawer with a backdrop, entirely absent from
          layout (display: none) above the lg breakpoint so it can never affect desktop sizing. */}
      {navOpen && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}
      <div
        className="fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden"
        style={{ transform: navOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <Sidebar trackers={trackers} onNavigate={() => setNavOpen(false)} onCloseMobile={() => setNavOpen(false)} />
      </div>

      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 lg:px-6">
          <button
            onClick={() => setNavOpen(true)}
            className="rounded-md p-2 text-muted hover:bg-white/5 hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Suspense fallback={<div className="w-full max-w-md" />}>
            <GlobalSearchBar />
          </Suspense>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
