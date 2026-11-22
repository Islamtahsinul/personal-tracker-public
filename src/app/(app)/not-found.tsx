import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2">
        <SearchX className="size-6 text-muted" />
      </div>
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        This tracker or item doesn&apos;t exist, or it may have been deleted.
      </p>
      <Link href="/dashboard" className="mt-5">
        <Button variant="secondary">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
