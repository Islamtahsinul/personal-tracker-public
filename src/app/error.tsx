"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="size-6 text-danger" />
      </div>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        An unexpected error occurred. Your data is safe — try again, or head back to the dashboard.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Dashboard
        </Button>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
