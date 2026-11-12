// Cloudflare Pages Function: GET /api/nowplaying?url=<stream-url>
//
// Returns what a station is playing right now, read from the stream's own ICY metadata
// (the StreamTitle that Icecast / SHOUTcast servers interleave with the audio).
//
// How it works: connect with `Icy-MetaData: 1`, read audio bytes up to the first metadata
// block (usually 8–32 KB), parse StreamTitle, then drop the connection.
// Results are cached per stream, so many listeners of one station cost one upstream read.

import { errorResponse, isCrossSite, parseTargetUrl } from '../_shared/guard';

interface PagesContext {
  request: Request;
  waitUntil: (promise: Promise<unknown>) => void;
}

type NowPlaying =
  | { status: 'song'; artist: string; title: string }
  | { status: 'text'; text: string } // a non-song title, e.g. a show name or slogan
  | { status: 'empty' } // metadata supported, but nothing announced right now
  | { status: 'unsupported' } // stream has no ICY metadata
  | { status: 'error' };

const CONNECT_TIMEOUT_MS = 8_000;
const READ_TIMEOUT_MS = 8_000;
// Never read more than this while looking for the metadata block
const MAX_READ_BYTES = 256 * 1024;

// How long each kind of answer stays cached (seconds)
const TTL: Record<NowPlaying['status'], number> = {
  song: 20,
  text: 20,
  empty: 20,
  unsupported: 3600,
  error: 60,
};

// ── Parsing ──────────────────────────────────────────────────────────────────

function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Older servers send Latin-1; decode byte-by-byte so nothing is lost
    return Array.from(bytes, b => String.fromCharCode(b)).join('');
  }
}

function parseStreamTitle(metadata: string): string {
  const match = metadata.match(/StreamTitle='(.*?)';/s);
  return (match?.[1] ?? '').replace(/\s+/g, ' ').trim();
}

// Placeholder titles some servers send instead of real information
const JUNK_TITLES = /^(-|unknown|untitled|n\/a|null|undefined|live|on air|\d+)$/i;

function classify(streamTitle: string): NowPlaying {
  if (!streamTitle || JUNK_TITLES.test(streamTitle)) return { status: 'empty' };

  // "Artist - Title" is the de-facto convention
  const sep = streamTitle.match(/\s[-–—]\s/);
  if (sep?.index != null) {
    const artist = streamTitle.slice(0, sep.index).trim();
    const title = streamTitle.slice(sep.index + sep[0].length).trim();
    if (artist && title && !JUNK_TITLES.test(artist) && !JUNK_TITLES.test(title)) {
      return { status: 'song', artist, title };
    }
  }
  return { status: 'text', text: streamTitle };
}

// ── Upstream read ────────────────────────────────────────────────────────────

async function readNowPlaying(target: URL): Promise<NowPlaying> {
  const controller = new AbortController();
  const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'SeashellRadio/1.0', Accept: '*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(connectTimer);
  }

  const metaint = Number(res.headers.get('icy-metaint'));
  if (!res.ok || !res.body || !Number.isFinite(metaint) || metaint <= 0 || metaint > MAX_READ_BYTES) {
    res.body?.cancel().catch(() => null);
    return res.ok ? { status: 'unsupported' } : { status: 'error' };
  }

  // Collect bytes until we have: <metaint audio bytes><1 length byte><length * 16 metadata bytes>
  const reader = res.body.getReader();
  const readTimer = setTimeout(() => reader.cancel().catch(() => null), READ_TIMEOUT_MS);
  const chunks: Uint8Array[] = [];
  let received = 0;
  let needed = metaint + 1;

  try {
    while (received < needed) {
      const { value, done } = await reader.read();
      if (done || !value) return { status: 'error' };
      chunks.push(value);
      received += value.length;

      if (needed === metaint + 1 && received >= metaint + 1) {
        const lengthByte = byteAt(chunks, metaint);
        if (lengthByte === 0) return { status: 'empty' };
        needed = metaint + 1 + lengthByte * 16;
      }
      if (received > MAX_READ_BYTES) return { status: 'error' };
    }

    const all = concat(chunks, needed);
    const metadata = decode(all.subarray(metaint + 1, needed)).replace(/\0+$/, '');
    return classify(parseStreamTitle(metadata));
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(readTimer);
    // Done with the stream — stop downloading audio
    reader.cancel().catch(() => null);
  }
}

function byteAt(chunks: Uint8Array[], index: number): number {
  let offset = 0;
  for (const c of chunks) {
    if (index < offset + c.length) return c[index - offset];
    offset += c.length;
  }
  return 0;
}

function concat(chunks: Uint8Array[], length: number): Uint8Array {
  const out = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    if (offset >= length) break;
    const part = c.subarray(0, Math.min(c.length, length - offset));
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ── Handler ──────────────────────────────────────────────────────────────────

function json(body: NowPlaying): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${TTL[body.status]}`,
    },
  });
}

export const onRequestGet = async ({ request, waitUntil }: PagesContext): Promise<Response> => {
  if (isCrossSite(request)) return errorResponse(403, 'Cross-site use of this API is not allowed.');

  const target = parseTargetUrl(request);
  if (target instanceof Response) return target;

  // One cache entry per stream, shared by every listener hitting the same Cloudflare location
  const cacheKey = new Request(`https://nowplaying.cache/${encodeURIComponent(target.toString())}`);
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;

  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) return cached;

  const response = json(await readNowPlaying(target));
  if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));
  return response;
};
