export function clampScrollRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1000, Math.round(ratio)));
}

export function getScrollRatioFromElement(el: HTMLElement): number {
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  if (maxScroll === 0) return 0;
  return clampScrollRatio((el.scrollTop / maxScroll) * 1000);
}

export function scrollElementToRatio(el: HTMLElement, ratio: number) {
  const r = clampScrollRatio(ratio);
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTop = (maxScroll * r) / 1000;
}
