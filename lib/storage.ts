/**
 * Centralized storage utility with type-safe nested structure
 * All app storage keys are nested under 'youtube_gallery' root
 */

import { User } from '@/types';
import { VideoFilters } from '@/hooks/useVideoFilters';

// Scroll mode types and helpers
export enum ScrollMode {
  AUTO = 'auto',
  MANUAL = 'manual'
}

export const DEFAULT_SCROLL_MODE = ScrollMode.AUTO;

// Root storage key
const ROOT_KEY = 'youtube_gallery';

// Storage structure types
interface AuthData {
  user: User | null;
  isAuthenticated: boolean;
}

interface ScrollPosition {
  scrollY: number;
  loadedPages: number;
  timestamp: number;
  filters: VideoFilters;
}

interface LocalStorageData {
  auth?: AuthData;
  scroll_mode?: ScrollMode;
}

interface SessionStorageData {
  scroll_positions?: Record<string, ScrollPosition>;
}

// Type-safe storage access
class StorageManager {
  private isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  private getRoot<T>(storage: Storage): T | null {
    if (!this.isAvailable()) return null;

    try {
      const data = storage.getItem(ROOT_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to parse storage root:', error);
      return null;
    }
  }

  private setRoot<T>(storage: Storage, data: T): void {
    if (!this.isAvailable()) return;

    try {
      storage.setItem(ROOT_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to set storage root:', error);
    }
  }

  // LocalStorage operations
  getLocal<K extends keyof LocalStorageData>(key: K): LocalStorageData[K] | null {
    const root = this.getRoot<LocalStorageData>(localStorage);
    return root?.[key] ?? null;
  }

  setLocal<K extends keyof LocalStorageData>(key: K, value: LocalStorageData[K]): void {
    const root = this.getRoot<LocalStorageData>(localStorage) || {};
    root[key] = value;
    this.setRoot(localStorage, root);
  }

  removeLocal<K extends keyof LocalStorageData>(key: K): void {
    const root = this.getRoot<LocalStorageData>(localStorage);
    if (root) {
      delete root[key];
      this.setRoot(localStorage, root);
    }
  }

  clearLocal(): void {
    if (!this.isAvailable()) return;
    localStorage.removeItem(ROOT_KEY);
  }

  // SessionStorage operations
  getSession<K extends keyof SessionStorageData>(key: K): SessionStorageData[K] | null {
    const root = this.getRoot<SessionStorageData>(sessionStorage);
    return root?.[key] ?? null;
  }

  setSession<K extends keyof SessionStorageData>(key: K, value: SessionStorageData[K]): void {
    const root = this.getRoot<SessionStorageData>(sessionStorage) || {};
    root[key] = value;
    this.setRoot(sessionStorage, root);
  }

  removeSession<K extends keyof SessionStorageData>(key: K): void {
    const root = this.getRoot<SessionStorageData>(sessionStorage);
    if (root) {
      delete root[key];
      this.setRoot(sessionStorage, root);
    }
  }

  clearSession(): void {
    if (!this.isAvailable()) return;
    sessionStorage.removeItem(ROOT_KEY);
  }

  // Scroll position helpers
  getScrollPosition(key: string): ScrollPosition | null {
    const positions = this.getSession('scroll_positions');
    return positions?.[key] ?? null;
  }

  setScrollPosition(key: string, position: ScrollPosition): void {
    const positions = this.getSession('scroll_positions') || {};
    positions[key] = position;
    this.setSession('scroll_positions', positions);
  }

  removeScrollPosition(key: string): void {
    const positions = this.getSession('scroll_positions');
    if (positions) {
      delete positions[key];
      this.setSession('scroll_positions', positions);
    }
  }

  // Clear all app storage (for logout)
  clearAll(): void {
    this.clearLocal();
    this.clearSession();
  }

  // Scroll mode helpers
  getScrollMode(): ScrollMode {
    const stored = this.getLocal('scroll_mode');
    return stored === ScrollMode.MANUAL ? ScrollMode.MANUAL : ScrollMode.AUTO;
  }

  setScrollMode(mode: ScrollMode): void {
    this.setLocal('scroll_mode', mode);
  }
}

export const storage = new StorageManager();
export type { AuthData, ScrollPosition, LocalStorageData, SessionStorageData };