// Shared request checks for the /api functions.
// This file exports no onRequest handlers, so Pages does not turn it into a route.

export function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Loopback, private and link-local hosts — never fetched on a caller's behalf. */
export function isBlockedHost(hostname: string): boolean {
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

/** Browsers send Sec-Fetch-Site on media and fetch requests; only our own pages may use the API. */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  return !!site && site !== 'same-origin' && site !== 'none';
}

/**
 * Reads and validates the `url` query parameter.
 * Returns the target URL, or an error Response to send back as-is.
 */
export function parseTargetUrl(request: Request): URL | Response {
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
  if (isBlockedHost(target.hostname)) return errorResponse(403, 'Host not allowed.');
  return target;
}
