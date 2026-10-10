import { dev } from '$app/environment';
import { sitemapPages } from '$lib/seo';
import type { RequestHandler } from './$types';

// Public pages for search engines (lib/seo.ts: a new lesson or trainer appears without editing this).
export const GET: RequestHandler = ({ url }) => {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPages(dev).map(
      (p) => `  <url><loc>${url.origin}${p.path}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
  ].join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
};
