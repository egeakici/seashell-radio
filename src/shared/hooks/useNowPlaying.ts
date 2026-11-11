import { useEffect } from 'react';
import { useStore } from '../../core/store/useStore';
import { fetchNowPlaying, type NowPlayingResponse } from '../../core/api/nowPlaying';
import type { Station, TrackInfo } from '../../core/types';

// Polling cadence. The server caches each station for ~20s, so polling faster gains nothing.
const POLL_VISIBLE_MS = 20_000;
const POLL_HIDDEN_MS = 45_000; // keep lock screen / car display reasonably fresh
const POLL_AFTER_ERROR_MS = 60_000;

// Streams found to carry no metadata — not asked again during this session
const unsupportedStreams = new Set<string>();

// Playback state can flip a few times while a stream starts, restarting the effect;
// reuse a very recent answer instead of asking the server again.
const REUSE_WITHIN_MS = 5_000;
const lastAnswer = new Map<string, { at: number; result: NowPlayingResponse }>();

async function getNowPlaying(url: string): Promise<NowPlayingResponse> {
  const recent = lastAnswer.get(url);
  if (recent && Date.now() - recent.at < REUSE_WITHIN_MS) return recent.result;
  const result = await fetchNowPlaying(url);
  lastAnswer.set(url, { at: Date.now(), result });
  return result;
}

function isHlsStream(station: Station, url: string): boolean {
  // HLS radio streams carry no ICY metadata (measured: none of the sampled stations had song tags)
  return station.hls === 1 || /\.m3u8(\?|$)/i.test(url);
}

function toTrack(result: NowPlayingResponse, station: Station): TrackInfo | null {
  if (result.status === 'song') return { kind: 'song', artist: result.artist, title: result.title };
  if (result.status === 'text') {
    // Many stations just repeat their own name — not worth showing
    const text = result.text.toLowerCase();
    const name = station.name.trim().toLowerCase();
    if (text === name || name.includes(text)) return null;
    return { kind: 'text', text: result.text };
  }
  return null;
}

const sameTrack = (a: TrackInfo | null, b: TrackInfo | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Keeps `nowPlaying` in the store up to date for the station that is playing.
 * Mount once at the app root. Only the current station is polled, and only while it plays.
 */
export function useNowPlaying() {
  const station = useStore(s => s.player.currentStation);
  const isPlaying = useStore(s => s.player.isPlaying);

  useEffect(() => {
    if (!station || !isPlaying) return;
    const url = station.url_resolved || station.url;
    if (isHlsStream(station, url) || unsupportedStreams.has(url)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const update = (track: TrackInfo | null) => {
      const { nowPlaying, setNowPlaying, player } = useStore.getState();
      // Ignore late answers for a station that is no longer playing
      if (player.currentStation?.stationuuid !== station.stationuuid) return;
      if (!sameTrack(nowPlaying, track)) setNowPlaying(track);
    };

    const tick = async () => {
      const result = await getNowPlaying(url);
      if (cancelled) return;

      if (result.status === 'unsupported') {
        unsupportedStreams.add(url);
        update(null);
        return; // stop polling this station
      }
      // On errors keep showing the last known track and retry later
      if (result.status !== 'error') update(toTrack(result, station));

      const delay = result.status === 'error'
        ? POLL_AFTER_ERROR_MS
        : document.visibilityState === 'visible' ? POLL_VISIBLE_MS : POLL_HIDDEN_MS;
      timer = setTimeout(tick, delay);
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [station, isPlaying]);
}
