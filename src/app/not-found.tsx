import Link from "next/link";
import { SearchX } from "lucide-react";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2">
        <SearchX className="size-6 text-muted" />
      </div>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">This page doesn&apos;t exist.</p>
      <Link href="/dashboard" className="mt-5 text-sm text-accent hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
