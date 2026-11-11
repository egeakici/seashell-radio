// Client for the /api/nowplaying Pages Function (see functions/api/nowplaying.ts)

export type NowPlayingResponse =
  | { status: 'song'; artist: string; title: string }
  | { status: 'text'; text: string }
  | { status: 'empty' }
  | { status: 'unsupported' }
  | { status: 'error' };

export async function fetchNowPlaying(streamUrl: string): Promise<NowPlayingResponse> {
  try {
    const res = await fetch(`/api/nowplaying?url=${encodeURIComponent(streamUrl)}`);
    if (!res.ok) return { status: 'error' };
    return (await res.json()) as NowPlayingResponse;
  } catch {
    // Network failure, or the dev server (npm run dev) which has no Pages Functions
    return { status: 'error' };
  }
}
