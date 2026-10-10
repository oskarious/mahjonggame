import { REFERENCE, published } from './learn/registry';
import { TRAINERS } from './train/registry';

// Which routes search engines see. robots.txt, sitemap.xml and the route SEO test (routes/seo.test.ts) all read this,
// so a new public page has to be listed here (or disallowed) and carry `Seo`.

/** Path prefixes disallowed in robots.txt: private and app-only areas. */
export const DISALLOW = ['/admin', '/account', '/online', '/play', '/api/', '/ws'];

export const disallowed = (path: string) =>
  DISALLOW.some((d) => path === d || path.startsWith(d.endsWith('/') ? d : `${d}/`));

/** Public routes deliberately left out of the sitemap, with the reason. */
export const UNLISTED: Record<string, string> = {
  '/login': 'thin form page, noindex',
  '/signup': 'thin form page; reached from the calls to action',
};

/** The sitemap: every public page, generated from the course and trainer registries. */
export function sitemapPages(dev: boolean): { path: string; lastmod?: string }[] {
  const lessons = published(dev);
  const latest = lessons
    .map((l) => l.updated)
    .sort()
    .at(-1);
  return [
    { path: '/' },
    { path: '/learn', lastmod: latest },
    ...lessons.map((l) => ({ path: `/learn/${l.slug}`, lastmod: l.updated })),
    { path: REFERENCE.yaku.path, lastmod: latest },
    { path: REFERENCE.glossary.path, lastmod: latest },
    { path: '/train' },
    { path: '/train/daily' },
    ...TRAINERS.map((t) => ({ path: `/train/${t.id}` })),
  ];
}
