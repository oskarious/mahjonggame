import { DISALLOW } from '$lib/seo';
import type { RequestHandler } from './$types';

// Private and app-only areas stay out of search results (lib/seo.ts); everything else may be crawled.
export const GET: RequestHandler = ({ url }) =>
  new Response(
    ['User-agent: *', ...DISALLOW.map((d) => `Disallow: ${d}`), '', `Sitemap: ${url.origin}/sitemap.xml`, ''].join(
      '\n',
    ),
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'max-age=3600',
      },
    },
  );
