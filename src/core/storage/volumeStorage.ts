const KEY = 'seashell-radio-volume';
// Keys used under the app's earlier names, newest first. Read once and copied to KEY.
const LEGACY_KEYS = ['radio-browser-volume', 'radio-drive-volume'];
const DEFAULT_VOLUME = 0.8;

export const volumeStorage = {
  load(): number {
    try {
      let raw = localStorage.getItem(KEY);
      if (raw === null) {
        const legacyKey = LEGACY_KEYS.find(key => localStorage.getItem(key) !== null);
        if (!legacyKey) return DEFAULT_VOLUME;
        raw = localStorage.getItem(legacyKey) as string;
        localStorage.setItem(KEY, raw);
      }
      const v = parseFloat(raw);
      return isNaN(v) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, v));
    } catch {
      return DEFAULT_VOLUME;
    }
  },

  save(volume: number): void {
    try {
      localStorage.setItem(KEY, String(volume));
    } catch {
      // ignore
    }
  },
};
