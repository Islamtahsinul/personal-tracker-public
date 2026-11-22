"use client";

import { useCallback, useRef } from "react";

/**
 * Runs enqueued async actions strictly one-at-a-time, in the order they were
 * enqueued — regardless of how long any individual call takes to resolve.
 *
 * Needed for "instant save" UI patterns (toggle a favourite, replace a tag
 * list, change a status) where each action sends a full snapshot of desired
 * state. Firing those independently lets network responses arrive out of
 * order and silently overwrite newer data with an older snapshot; chaining
 * them onto one promise guarantees writes land in trigger order.
 */
export function useSerialQueue() {
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  return useCallback((action: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(action, action);
  }, []);
}
