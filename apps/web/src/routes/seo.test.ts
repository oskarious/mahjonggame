// Every public page must stay strong for search: it renders `Seo` (title, description, canonical, link previews,
// JSON-LD) with a title search engines show in full, and is in the sitemap, or lib/seo.ts disallows it in robots.txt or names why it is left out. A new page that
// forgets any of this fails here, named by its route.
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LESSONS, REFERENCE } from '../lib/learn/registry';
import { UNLISTED, disallowed, sitemapPages } from '../lib/seo';
import { MAX_TITLE_LENGTH, seoTitle } from '../lib/site';
import { TRAINERS } from '../lib/train/registry';

const routes = fileURLToPath(new URL('.', import.meta.url));
const src = fileURLToPath(new URL('..', import.meta.url));

/** Route path of each `+page.svelte` (layout groups dropped), with its file. */
const pages = readdirSync(routes, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith(`${sep}+page.svelte`) || f === '+page.svelte')
  .map((f) => {
    const segments = f
      .split(sep)
      .slice(0, -1)
      .filter((s) => !/^\(.*\)$/.test(s));
    return { path: `/${segments.join('/')}`, file: join(routes, f) };
  });

const publicPages = pages.filter((p) => !disallowed(p.path));

/** The page's source plus that of the `$lib` components it renders directly (one level: where `Seo` may live). */
function sources(file: string): string[] {
  const own = readFileSync(file, 'utf8');
  const used = [...own.matchAll(/import (\w+) from ['"]\$lib\/([^'"]+\.svelte)['"]/g)]
    .filter(([, name]) => new RegExp(`<${name}[\\s/>]`).test(own))
    .map(([, , path]) => readFileSync(join(src, 'lib', path), 'utf8'));
  return [own, ...used];
}

const rendersSeo = (file: string) => sources(file).some((s) => /<Seo[\s/>]/.test(s));
/** Literal `<Seo title="…">` values; the rest come from the registries (checked below). */
const literalTitles = (file: string) =>
  sources(file).flatMap((s) => [...s.matchAll(/<Seo[^>]*\stitle="([^"]*)"/g)].map((m) => m[1]));
const noindex = (file: string) => sources(file).some((s) => /<Seo[^>]*\snoindex[\s/>]/.test(s));

/** `/learn/[slug]` → a pattern matching its concrete paths. */
const pattern = (route: string) => new RegExp(`^${route.replace(/\[[^\]]+\]/g, '[^/]+')}$`);

const listed = sitemapPages(false).map((p) => p.path);

describe('route SEO', () => {
  it('finds the public pages', () => {
    expect(publicPages.map((p) => p.path)).toContain('/');
    expect(publicPages.map((p) => p.path)).toContain('/learn/[slug]');
    expect(literalTitles(publicPages.find((p) => p.path === '/train')!.file)).toHaveLength(1);
  });

  describe.each(publicPages.map((p) => [p.path, p.file] as const))('%s', (path, file) => {
    it('renders Seo', () => {
      expect(rendersSeo(file), `${path}: render <Seo> in the page or a component it renders, or disallow it`).toBe(
        true,
      );
    });

    it(`has a title of at most ${MAX_TITLE_LENGTH} characters`, () => {
      for (const title of literalTitles(file))
        expect(seoTitle(title).length, title).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });

    it('is in the sitemap, or left out with a reason', () => {
      if (noindex(file) || UNLISTED[path]) return;
      expect(
        listed.some((l) => pattern(path).test(l)),
        `${path}: add it to sitemapPages, or to UNLISTED with the reason`,
      ).toBe(true);
    });
  });

  it('lists only public pages that exist, and nothing left out on purpose', () => {
    for (const l of listed) {
      expect(disallowed(l), `${l} is disallowed in robots.txt`).toBe(false);
      expect(UNLISTED[l], `${l} is marked unlisted`).toBeUndefined();
      expect(
        publicPages.some((p) => pattern(p.path).test(l)),
        `${l} has no page`,
      ).toBe(true);
    }
  });

  it('lists every published lesson and trainer', () => {
    for (const l of LESSONS.filter((l) => !l.draft)) expect(listed, l.slug).toContain(`/learn/${l.slug}`);
    for (const t of TRAINERS) expect(listed, t.id).toContain(`/train/${t.id}`);
  });

  it(`keeps lesson, reference and trainer titles to ${MAX_TITLE_LENGTH} characters`, () => {
    const titles = [...LESSONS, ...Object.values(REFERENCE), ...TRAINERS].map((p) => p.seoTitle);
    for (const title of titles) expect(seoTitle(title).length, title).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
  });

  it('keeps UNLISTED to public pages', () => {
    for (const path of Object.keys(UNLISTED)) {
      expect(disallowed(path), path).toBe(false);
      expect(
        pages.some((p) => p.path === path),
        `${path} has no page`,
      ).toBe(true);
    }
  });
});
