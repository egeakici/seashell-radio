import Hls from 'hls.js';

export type AudioEvent = 'playing' | 'paused' | 'loading' | 'error' | 'ended';
type Listener = (event: AudioEvent) => void;

/** Thrown when a play() call is superseded by a newer play()/stop() before it finished. */
export class PlaybackAbortedError extends Error {
  constructor() {
    super('Playback superseded');
    this.name = 'PlaybackAbortedError';
  }
}

const ATTEMPT_TIMEOUT_MS = 12_000;
const PROXY_ENDPOINT = '/api/stream';

function proxied(url: string): string {
  return `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`;
}

function isHlsUrl(url: string): boolean {
  try {
    return new URL(url, window.location.href).pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return url.toLowerCase().includes('.m3u8');
  }
}

/**
 * Ordered list of URLs to try for a stream:
 *  1. the stream itself — upgraded to https:// when the page is served over HTTPS
 *     (browsers block http:// media on https:// pages as mixed content)
 *  2. the same-origin proxy (/api/stream), which handles http-only and CORS-less streams
 */
function buildCandidates(url: string): string[] {
  const pageIsHttps = window.location.protocol === 'https:';
  const direct = pageIsHttps && url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
  return [direct, proxied(url)];
}

class AudioEngine {
  private _audio: HTMLAudioElement;
  private _hls: Hls | null = null;
  private _listeners = new Set<Listener>();
  private _currentUrl = '';
  /** Incremented on every play()/stop(); stale attempts compare against it and bail out. */
  private _session = 0;
  /** While trying candidates, element errors are expected and must not reach the UI. */
  private _attempting = false;
  /** Streams that only worked through the proxy — skip the doomed direct attempt next time. */
  private _needsProxy = new Set<string>();

  constructor() {
    this._audio = new Audio();
    this._audio.preload = 'none';

    this._audio.addEventListener('playing', () => this._emit('playing'));
    this._audio.addEventListener('pause', () => { if (!this._attempting) this._emit('paused'); });
    this._audio.addEventListener('waiting', () => this._emit('loading'));
    this._audio.addEventListener('stalled', () => this._emit('loading'));
    this._audio.addEventListener('ended', () => this._emit('ended'));
    this._audio.addEventListener('error', () => {
      // Errors after the source was cleared, or during fallback attempts, are not user-facing
      if (this._attempting || !this._audio.getAttribute('src')) return;
      this._emit('error');
    });
  }

  private _emit(event: AudioEvent) {
    this._listeners.forEach(fn => fn(event));
  }

  private _resetSource() {
    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }
    // removeAttribute + load() detaches the source without firing an 'error' event (src = '' does)
    this._audio.removeAttribute('src');
    this._audio.load();
  }

  private _checkSession(session: number) {
    if (session !== this._session) throw new PlaybackAbortedError();
  }

  private async _withTimeout<T>(promise: Promise<T>, session: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Stream attempt timed out')), ATTEMPT_TIMEOUT_MS);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
      this._checkSession(session);
    }
  }

  private async _attempt(src: string, isHls: boolean, session: number): Promise<void> {
    this._resetSource();

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this._hls = hls;

      const ready = new Promise<void>((resolve, reject) => {
        hls.once(Hls.Events.MANIFEST_PARSED, () => resolve());
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (this._attempting) {
            reject(new Error(`HLS fatal error: ${data.details}`));
          } else if (this._hls === hls) {
            this._emit('error');
          }
        });
      });

      hls.loadSource(src);
      hls.attachMedia(this._audio);
      await this._withTimeout(ready, session);
    } else {
      // Plain Icecast/SHOUTcast streams, or native HLS (Safari/iOS)
      this._audio.src = src;
    }

    await this._withTimeout(this._audio.play(), session);
  }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * Plays a stream, transparently falling back to an https upgrade and then the proxy.
   * Rejects with PlaybackAbortedError if superseded by another play()/stop().
   */
  async play(url: string, hls = false): Promise<void> {
    if (url === this._currentUrl && !this._audio.paused) return;

    const session = ++this._session;
    this._currentUrl = url;
    this._emit('loading');

    const isHls = hls || isHlsUrl(url);
    let candidates = buildCandidates(url);
    if (this._needsProxy.has(url)) candidates = candidates.slice(-1);

    let lastError: unknown = new Error('No stream candidates');
    this._attempting = true;
    try {
      for (let i = 0; i < candidates.length; i++) {
        try {
          await this._attempt(candidates[i], isHls, session);
          if (i === candidates.length - 1 && candidates.length > 1) this._needsProxy.add(url);
          return;
        } catch (err) {
          if (err instanceof PlaybackAbortedError) throw err;
          this._checkSession(session);
          lastError = err;
        }
      }
      this._resetSource();
      throw lastError;
    } finally {
      if (session === this._session) this._attempting = false;
    }
  }

  resume(): Promise<void> {
    return this._audio.play();
  }

  pause(): void {
    this._audio.pause();
  }

  stop(): void {
    this._session++;
    this._attempting = false;
    this._audio.pause();
    this._resetSource();
    this._currentUrl = '';
  }

  setVolume(v: number): void {
    this._audio.volume = Math.max(0, Math.min(1, v));
  }

  get isPaused(): boolean {
    return this._audio.paused;
  }

  get volume(): number {
    return this._audio.volume;
  }
}

// Singleton — survives component unmounts, keeps audio playing across mode switches
export const audioEngine = new AudioEngine();
