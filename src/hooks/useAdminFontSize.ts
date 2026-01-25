import { useState, useEffect, useCallback } from 'react';

type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'admin-font-size';

const fontSizeMap: Record<FontSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

const fontSizeLabels: Record<FontSize, string> = {
  small: 'Piccolo',
  medium: 'Medio',
  large: 'Grande',
};

export function useAdminFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['small', 'medium', 'large'].includes(saved)) {
        return saved as FontSize;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'medium';
  });

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSizeState(prev => {
      const sizes: FontSize[] = ['small', 'medium', 'large'];
      const currentIndex = sizes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % sizes.length;
      const next = sizes[nextIndex];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return {
    fontSize,
    setFontSize,
    cycleFontSize,
    fontSizeClass: fontSizeMap[fontSize],
    fontSizeLabel: fontSizeLabels[fontSize],
  };
}
