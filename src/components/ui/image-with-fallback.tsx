"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getTrackerIcon } from "@/lib/icon-registry";

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackIconKey,
  fallbackColor,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** A tracker icon registry key (e.g. "car"), not a resolved component — icon components
   * can't be passed as props across the server/client boundary. */
  fallbackIconKey: string | null | undefined;
  fallbackColor?: string | null;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    const FallbackIcon = getTrackerIcon(fallbackIconKey);
    return (
      <div
        className={cn("flex items-center justify-center bg-surface-2", className)}
        style={fallbackColor ? { backgroundColor: `${fallbackColor}18` } : undefined}
      >
        {/* ICON_REGISTRY is a static module-level map, so this reference is stable across renders. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <FallbackIcon className="size-1/4 min-h-6 min-w-6" style={fallbackColor ? { color: fallbackColor } : undefined} />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- images come from many unpredictable external hosts (TMDB/IGDB/OpenLibrary/Wikimedia); next/image would need every domain allow-listed.
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setErrored(true)} className={className} />;
}
