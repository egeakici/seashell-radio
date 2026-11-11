// Cloudflare Pages Function: GET /api/stream?url=<stream-url>
//
// Relays radio streams that the browser cannot load directly from an HTTPS page:
//   - http:// streams (blocked as mixed content)
//   - HLS playlists/segments served without CORS headers
// HLS playlists are rewritten so every segment / sub-playlist also goes through this proxy.
// Only audio/video/playlist responses are relayed, so this cannot be used as a generic web proxy.

const PROXY_PATH = '/api/stream';
const UPSTREAM_TIMEOUT_MS = 15_000;

const PLAYLIST_TYPES = ['mpegurl', 'x-mpegurl', 'vnd.apple.mpegurl'];
const MEDIA_TYPE_PREFIXES = ['audio/', 'video/', 'application/ogg', 'application/octet-stream'];

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h.includes(':')) {
    // IPv6 literal: loopback, unspecified, unique-local, link-local
    return h === '::1' || h === '::' || /^f[cd]/.test(h) || h.startsWith('fe80');
  }
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function proxify(target: string): string {
  return `${PROXY_PATH}?url=${encodeURIComponent(target)}`;
}

function rewritePlaylist(body: string, baseUrl: string): string {
  const resolve = (ref: string) => {
    try {
      return proxify(new URL(ref, baseUrl).toString());
    } catch {
      return ref;
    }
  };

  return body
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      // Tags like #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-MAP carry URIs in a URI="..." attribute
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${resolve(uri)}"`);
      }
      return resolve(trimmed);
    })
    .join('\n');
}

function isPlaylist(contentType: string, url: URL): boolean {
  return PLAYLIST_TYPES.some(t => contentType.includes(t)) || url.pathname.toLowerCase().endsWith('.m3u8');
}

function isMedia(contentType: string): boolean {
  // Some Icecast/SHOUTcast servers send no content type at all
  return contentType === '' || MEDIA_TYPE_PREFIXES.some(p => contentType.startsWith(p));
}

export const onRequestGet = async ({ request }: { request: Request }): Promise<Response> => {
  // Only serve our own pages — browsers send Sec-Fetch-Site on media and fetch requests
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return errorResponse(403, 'Cross-site use of this proxy is not allowed.');
  }

  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) return errorResponse(400, 'Missing "url" parameter.');

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return errorResponse(400, 'Invalid "url" parameter.');
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return errorResponse(400, 'Only http and https streams are supported.');
  }
  if (isBlockedHost(target.hostname)) {
    return errorResponse(403, 'Host not allowed.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'GlobalRadioBrowser/1.0', Accept: '*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch {
    return errorResponse(502, 'Upstream stream unreachable.');
  } finally {
    // Headers have arrived (or failed); the body itself may stream indefinitely
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    upstream.body?.cancel();
    return errorResponse(502, `Upstream responded with ${upstream.status}.`);
  }

  const contentType = (upstream.headers.get('Content-Type') ?? '').toLowerCase();
  const finalUrl = new URL(upstream.url || target.toString());

  if (isPlaylist(contentType, finalUrl)) {
    const text = await upstream.text();
    if (!text.trimStart().startsWith('#EXTM3U')) {
      return errorResponse(415, 'Upstream did not return an HLS playlist.');
    }
    return new Response(rewritePlaylist(text, finalUrl.toString()), {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (!isMedia(contentType)) {
    upstream.body?.cancel();
    return errorResponse(415, 'Upstream did not return an audio stream.');
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType || 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
