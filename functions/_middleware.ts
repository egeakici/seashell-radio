// Temporary shutdown switch for the public site.
//
// Set the environment variable SITE_PAUSED=true on the Pages project (production) and
// redeploy: every request — pages, static files and both /api functions — then gets a
// short "paused" page, on seashellradio.com and on the pages.dev address alike.
// Remove the variable and redeploy to bring the site back. Nothing is deleted.

interface MiddlewareContext {
  env: { SITE_PAUSED?: string };
  next: () => Promise<Response>;
}

const PAUSED_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Seashell Radio</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #0f0e14; color: #f4f3fa;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center;
  }
  main { padding: 24px; }
  h1 { margin: 0 0 8px; font-size: 22px; font-weight: 600; }
  p { margin: 0; color: rgba(244, 243, 250, 0.6); font-size: 15px; }
</style>
</head>
<body>
<main>
  <h1>Seashell Radio</h1>
  <p>The site is temporarily unavailable.</p>
</main>
</body>
</html>`;

export const onRequest = async ({ env, next }: MiddlewareContext): Promise<Response> => {
  if (env.SITE_PAUSED !== 'true') return next();

  return new Response(PAUSED_PAGE, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '86400',
    },
  });
};
