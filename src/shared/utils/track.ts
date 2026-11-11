import type { TrackInfo } from '../../core/types';

/** One-line label for a track: "Artist — Title", or the station's announcement text */
export function formatTrack(track: TrackInfo): string {
  return track.kind === 'song' ? `${track.artist} — ${track.title}` : track.text;
}
