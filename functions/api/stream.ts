// Cloudflare Pages Function: GET /api/stream?url=<stream-url>
//
// Relays radio streams that the browser cannot load directly from an HTTPS page:
//   - http:// streams (blocked as mixed content)
//   - HLS playlists/segments served without CORS headers
// HLS playlists are rewritten so every segment / sub-playlist also goes through this proxy.
// Only audio/video/playlist responses are relayed, so this cannot be used as a generic web proxy.

import { errorResponse, isCrossSite, parseTargetUrl } from '../_shared/guard';

const PROXY_PATH = '/api/stream';
const UPSTREAM_TIMEOUT_MS = 15_000;

const PLAYLIST_TYPES = ['mpegurl', 'x-mpegurl', 'vnd.apple.mpegurl'];
const MEDIA_TYPE_PREFIXES = ['audio/', 'video/', 'application/ogg', 'application/octet-stream'];

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
  if (isCrossSite(request)) return errorResponse(403, 'Cross-site use of this proxy is not allowed.');

  const target = parseTargetUrl(request);
  if (target instanceof Response) return target;

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
