## Why

A code audit of the public pages (2026-10-10) found that Learn and Train are well covered for search, but the home
page, the page that should rank for "play riichi mahjong online", has no meta description, no canonical URL, no
structured data and no visible text naming the game. Smaller gaps (two spellings of the site name, indexable auth
pages, a bare 404 page, incomplete lesson and course structured data, PNG-less icons) also cost ranking or how results
look. All of it is cheap to fix now, while the site is young and Search Console/Bing data is starting to arrive.

## What Changes

- A standing rule: every frontend change that adds or changes a public page must keep it strong for search (metadata,
  canonical, structured data where it fits, sitemap entry or a stated reason not to, or explicitly not indexed). A
  route SEO test enforces it, and AGENTS.md lists it under the rules that always apply.
- Home page: unique title and meta description, canonical URL, Open Graph/Twitter tags, a visible tagline with the
  words "riichi mahjong", and `WebSite` + `Organization` JSON-LD (all via the existing `Seo` component, moved to a
  shared place since it is no longer Learn-only).
- One site name for search: "Riichi Arena" in every `<title>`, `og:site_name` and JSON-LD, from one constant (the
  lowercase wordmark stays a visual treatment only).
- Default link-preview tags (pages without their own metadata) gain `og:url`, `twitter:title` and a meta description.
- `/login` gets `noindex`; `/signup` leaves the sitemap (both are thin form pages).
- A site error page (`+error.svelte`): title, short message, links home and to Learn, `noindex`; 404 status kept.
- Lesson JSON-LD gains `author`, `datePublished` and `image`; the breadcrumb data includes the unit, like the visible
  breadcrumb. Each lesson registry entry gets a `published` date.
- The `/learn` `Course` JSON-LD is completed for Google's course rich results (`offers` free, `hasCourseInstance`
  online and self-paced).
- PNG icons (favicon 48 px, `apple-touch-icon` 180 px) and a minimal web app manifest, next to the SVG favicon.
- Deployment docs state the single canonical origin (`ORIGIN`) and that www→apex and http→https redirect at the
  proxy; verified on the live site.

Non-goals: per-page generated social images, content/keyword work, connecting Search Console/Bing/Plausible data.

## Capabilities

### New Capabilities
- `site-seo`: site-wide search requirements outside Learn and Train: home page metadata and structured data, one site
  name, default link-preview tags, indexing rules for auth and error pages, icons and the canonical origin.

### Modified Capabilities
- `learn-section`: "Search engine metadata" requires fuller lesson `Article` data (author, published date, image), a
  breadcrumb including the unit, and a complete `Course`; "Discoverable by search engines" leaves `/signup` out of the
  sitemap.

## Impact

- `apps/web/src/routes/+page.svelte`, `+layout.svelte`, `login/+page.svelte`, new `+error.svelte`,
  `sitemap.xml/+server.ts`, `learn/+page.svelte`
- `apps/web/src/lib/learn/components/Seo.svelte` (moves to `lib/components/`), `lib/components/Title.svelte`
  (`SITE_NAME`), `lib/learn/components/LessonBody.svelte`, `lib/learn/registry.ts` (+ its test), trainer and
  reference pages that import `Seo`
- `apps/web/src/app.html`, `apps/web/static/brand/` (new PNG icons, manifest)
- `docs/agents/web.md`, `docs/agents/deployment.md`; the design system and `design-kit/` if icons count as brand
  assets
- The home page is also being edited by another change in progress: merge with it, don't overwrite.
