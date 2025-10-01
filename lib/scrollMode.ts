import { storage } from './storage';

export enum ScrollMode {
  AUTO = 'auto',
  MANUAL = 'manual'
}

export const DEFAULT_SCROLL_MODE = ScrollMode.AUTO;

export function getScrollMode(): ScrollMode {
  const stored = storage.getLocal('scroll_mode');
  return stored === ScrollMode.MANUAL ? ScrollMode.MANUAL : ScrollMode.AUTO;
}

export function setScrollMode(mode: ScrollMode): void {
  storage.setLocal('scroll_mode', mode);
}