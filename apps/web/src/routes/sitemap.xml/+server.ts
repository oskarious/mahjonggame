import { dev } from '$app/environment';
import { REFERENCE, published } from '$lib/learn/registry';
import type { RequestHandler } from './$types';

// Public pages for search engines, generated from the course registry (a new lesson appears without editing this).
export const GET: RequestHandler = ({ url }) => {
  const lessons = published(dev);
  const latest = lessons
    .map((l) => l.updated)
    .sort()
    .at(-1);
  const pages: { path: string; lastmod?: string }[] = [
    { path: '/' },
    { path: '/learn', lastmod: latest },
    ...lessons.map((l) => ({ path: `/learn/${l.slug}`, lastmod: l.updated })),
    { path: REFERENCE.yaku.path, lastmod: latest },
    { path: REFERENCE.glossary.path, lastmod: latest },
    { path: '/signup' },
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(
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
