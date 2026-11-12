import type { Station } from '../types';

const KEY = 'seashell-radio-favorites';
// Keys used under the app's earlier names, newest first. Read once and copied to KEY.
const LEGACY_KEYS = ['radio-browser-favorites', 'radio-drive-favorites'];
const LEGACY_STORE_KEY = 'radio-drive-v1';

export const favoritesStorage = {
  load(): Station[] {
    try {
      const current = localStorage.getItem(KEY);
      if (current !== null) return JSON.parse(current) as Station[];

      for (const key of LEGACY_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        const parsed = JSON.parse(raw) as Station[];
        this.save(parsed);
        return parsed;
      }
      // One-time migration: move favorites from old Zustand persist key
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as { favorites?: Station[] };
        if (parsed.favorites?.length) {
          this.save(parsed.favorites);
          return parsed.favorites;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  save(stations: Station[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(stations));
    } catch {
      // localStorage full or inaccessible
    }
  },
};
