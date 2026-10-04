import type { RequestHandler } from './$types';

// Private and app-only areas stay out of search results; everything else may be crawled.
export const GET: RequestHandler = ({ url }) =>
  new Response(
    [
      'User-agent: *',
      'Disallow: /admin',
      'Disallow: /account',
      'Disallow: /online',
      'Disallow: /play',
      'Disallow: /api/',
      'Disallow: /ws',
      '',
      `Sitemap: ${url.origin}/sitemap.xml`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'max-age=3600',
      },
    },
  );
