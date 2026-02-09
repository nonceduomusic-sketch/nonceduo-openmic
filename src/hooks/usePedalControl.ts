/**
 * Pedal control hook for IK Multimedia BlueTurn and similar Bluetooth pedals.
 * Listens for keyboard events (PageUp/Down, ArrowUp/Down, ArrowLeft/Right)
 * and advances/retreats content by a configurable number of steps.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type PedalPage = 'trasmetti' | 'partiture' | 'songbook';

export interface PedalSettings {
  enabled: boolean;
  linesPerPress: number; // 1-20
  enabledPages: PedalPage[];
}

const STORAGE_KEY = 'pedal_settings';

const DEFAULT_SETTINGS: PedalSettings = {
  enabled: false,
  linesPerPress: 3,
  enabledPages: ['trasmetti', 'partiture', 'songbook'],
};

// Keys that pedals typically send
const NEXT_KEYS = ['PageDown', 'ArrowDown', 'ArrowRight'];
const PREV_KEYS = ['PageUp', 'ArrowUp', 'ArrowLeft'];

export function usePedalSettings() {
  const [settings, setSettingsState] = useState<PedalSettings>(() => {
    try {
      const stored = safeGetItem('local', STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((partial: Partial<PedalSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      safeSetItem('local', STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

/**
 * Pedal control for highlight_line based pages (Trasmetti, Admin LivePreview).
 */
interface UsePedalHighlightOptions {
  page: PedalPage;
  highlightLine: number;
  totalLines: number;
  onLineChange: (newLine: number) => void;
  disabled?: boolean;
}

export function usePedalControl({
  page,
  highlightLine,
  totalLines,
  onLineChange,
  disabled = false,
}: UsePedalHighlightOptions) {
  const { settings } = usePedalSettings();
  const onLineChangeRef = useRef(onLineChange);
  onLineChangeRef.current = onLineChange;
  const highlightLineRef = useRef(highlightLine);
  highlightLineRef.current = highlightLine;
  const totalLinesRef = useRef(totalLines);
  totalLinesRef.current = totalLines;

  const isActive = settings.enabled && !disabled && settings.enabledPages.includes(page);

  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      const step = settings.linesPerPress;

      if (NEXT_KEYS.includes(e.key)) {
        e.preventDefault();
        const newLine = Math.min(totalLinesRef.current - 1, highlightLineRef.current + step);
        onLineChangeRef.current(newLine);
      } else if (PREV_KEYS.includes(e.key)) {
        e.preventDefault();
        const newLine = Math.max(0, highlightLineRef.current - step);
        onLineChangeRef.current(newLine);
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isActive, settings.linesPerPress]);

  return { isActive };
}

/**
 * Pedal control for scroll-based pages (SongbookLive, Partiture).
 * Scrolls a container by linesPerPress * estimated line height.
 */
interface UsePedalScrollOptions {
  page: PedalPage;
  scrollRef: React.RefObject<HTMLElement>;
  onAfterScroll?: () => void;
  disabled?: boolean;
  lineHeightPx?: number; // default ~32px
}

export function usePedalScroll({
  page,
  scrollRef,
  onAfterScroll,
  disabled = false,
  lineHeightPx = 32,
}: UsePedalScrollOptions) {
  const { settings } = usePedalSettings();
  const onAfterScrollRef = useRef(onAfterScroll);
  onAfterScrollRef.current = onAfterScroll;

  const isActive = settings.enabled && !disabled && settings.enabledPages.includes(page);

  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      if (!scrollRef.current) return;
      const scrollAmount = settings.linesPerPress * lineHeightPx;

      if (NEXT_KEYS.includes(e.key)) {
        e.preventDefault();
        scrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        requestAnimationFrame(() => onAfterScrollRef.current?.());
      } else if (PREV_KEYS.includes(e.key)) {
        e.preventDefault();
        scrollRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        requestAnimationFrame(() => onAfterScrollRef.current?.());
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isActive, settings.linesPerPress, lineHeightPx, scrollRef]);

  return { isActive };
}
