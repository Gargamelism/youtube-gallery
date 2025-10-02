import { storage } from './storage';

export { ScrollMode, DEFAULT_SCROLL_MODE } from './storage';

export const getScrollMode = () => storage.getScrollMode();
export const setScrollMode = (mode: Parameters<typeof storage.setScrollMode>[0]) => storage.setScrollMode(mode);