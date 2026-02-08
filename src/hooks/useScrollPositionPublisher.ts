import { useCallback, useEffect, useRef } from "react";
import { clampScrollRatio, getScrollRatioFromElement } from "@/lib/scrollRatio";

type Options = {
  enabled: boolean;
  publish: (ratio: number) => void | Promise<unknown>;
  throttleMs?: number;
  minDelta?: number;
};

/**
 * Throttled publisher for scroll ratio (0-1000).
 * Designed for realtime sync without flooding the backend.
 */
export function useScrollPositionPublisher({
  enabled,
  publish,
  throttleMs = 60,
  minDelta = 2,
}: Options) {
  const lastSentRef = useRef<number | null>(null);
  const queuedRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flush = useCallback(() => {
    timerRef.current = null;

    const next = queuedRef.current;
    queuedRef.current = null;

    if (next === null) return;
    if (lastSentRef.current !== null && Math.abs(next - lastSentRef.current) < minDelta) return;

    lastSentRef.current = next;
    void publish(next);
  }, [minDelta, publish]);

  const schedulePublish = useCallback(
    (ratio: number) => {
      const r = clampScrollRatio(ratio);
      queuedRef.current = r;

      if (timerRef.current !== null) return;
      timerRef.current = window.setTimeout(flush, throttleMs);
    },
    [flush, throttleMs]
  );

  const onScroll = useCallback(
    (el: HTMLElement) => {
      if (!enabled) return;
      schedulePublish(getScrollRatioFromElement(el));
    },
    [enabled, schedulePublish]
  );

  return { onScroll };
}
