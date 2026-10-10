## Context

SEO metadata today comes from two places: `lib/learn/components/Seo.svelte` (title, description, canonical, OG/Twitter,
JSON-LD; used by Learn, Train and the reference pages, which set `contentPage`) and `lib/components/Title.svelte`
(title plus optional description; used by the home page, auth pages and the rest), with default OG tags in
`routes/+layout.svelte` for pages that are not `contentPage`. `robots.txt` and `sitemap.xml` are hand-listed in their
`+server.ts` files, with lessons and trainers generated from the registries. The site name is a lowercase constant
(`SITE_NAME = "riichi arena"`) in titles, while `Seo.svelte` and JSON-LD hard-code "Riichi Arena".

The home page is being edited by another change in progress; this change must merge with it.

## Goals / Non-Goals

**Goals:**
- Fix the audit findings (see proposal) with the smallest structural change.
- Make strong SEO the default for new pages and make missing SEO a failing test, not a review comment.

**Non-Goals:**
- Generated per-page social images, content or keyword work, Search Console/Bing/Plausible integrations.
- Changing the visual wordmark or the home page layout beyond one tagline line.

## Decisions

**One `Seo` component for every indexable page.** Move `Seo.svelte` to `lib/components/` and use it on the home page
too, with a `noindex` prop for `/login` and the error page. `Title.svelte` stays only for pages disallowed in
robots.txt (play, online, account, admin); its `description` prop goes. *Alternative:* extend `Title` with canonical/OG. Rejected: two components doing the same
job is how the home page fell through.

**Default preview tags move into `Title`.** The layout's default tags (shown unless `contentPage`) are removed;
`Title`, used only by app pages, renders the title plus default tags (`og:url` = origin + pathname, `twitter:title`,
the default description). Pages with `Seo` never render `Title`, so no flag is needed and tags are never duplicated.
*Alternatives:* keep the defaults in the layout behind an `ownMeta` page-data flag (planned first; dropped because the
error page and every `Seo` page would need to set it), or keep keying on `contentPage` (would hide the fullscreen
toggle on the home page).

**`SITE_NAME = "Riichi Arena"`.** One constant, in `lib/site.ts` with the default description, preview image and
`siteOrganization(origin)` for JSON-LD; imported by `Title`, `Seo` and every JSON-LD block. The lowercase look stays in
the wordmark SVG. The home `<h1>` keeps the logo image with alt "Riichi Arena".

**Site constants in `lib/site.ts`** (`SITE_NAME`, default description, preview image, `siteOrganization`).

**Public-route rules in one module, `lib/seo.ts`.** It exports the robots `DISALLOW` list (used by `robots.txt`), the
sitemap page list (used by `sitemap.xml`, moved from the handler) and an `UNLISTED` map of public routes deliberately
left out of the sitemap with the reason (`/login`, `/signup`: thin form pages). Handlers become thin.

**Route SEO test (`apps/web/src/routes/seo.test.ts`, Vitest, static).** It globs `routes/**/+page.svelte`, maps each
file to its route path, and for each public route (not matching `DISALLOW`) checks:
1. the page, or a `$lib` component it renders directly (one import level, which covers `LessonBody` and `Trainer`),
   contains `<Seo`;
2. the route is in the sitemap list (dynamic routes: every registry entry is listed) or in `UNLISTED`, unless the
   page passes `noindex`.
It reports the failing route by path. *Alternative:* render pages through a production build and parse HTML. More
exact, but slow and needs a DB; the static check catches the real failure mode (a page that forgot `Seo` or the
sitemap). A mutation check (drop `<Seo` from one page, drop one sitemap entry) confirms it bites.

**Lesson structured data.** Add `published: string` (ISO date) to each `LessonMeta`, set to the date the lesson went
live (from git history of its registry entry); the registry test checks it is a valid date not after `updated`.
`author` and `publisher` are the site `Organization`; `image` is the shared `/brand/og.png` until per-page images
exist. The `BreadcrumbList` adds the unit as `/learn#<unit-id>`.

**Course rich result.** Add `offers: { '@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'EUR' }` and
`hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: <ISO 8601 duration> }` on the
`Course`, with the workload estimated from the number of lesson parts (a few minutes each). Validate with Google's
Rich Results Test before shipping and follow whatever fields it currently requires. The test (2026-10-10) read the old
`hasPart` lesson list plus `isAccessibleForFree` as paywall markup ("Paywalled Content", 26 warnings), so both are
dropped: `offers` says it is free, lessons point back with `isPartOf`, and the page and sitemap link every lesson.

**Error page.** `routes/+error.svelte` uses `ContentShell`, shows the status and a one-line message, links home and
to `/learn`, and renders `Seo` with `noindex`, title "Page not found" (404) or "Something went wrong". SvelteKit keeps
the status code.

**Icons.** Render `icon-48.png`, `icon-512.png` (manifest, `Organization.logo`) and `apple-touch-icon.png` (180 px, B2 mark on green, no transparency) from
`brand/icon.svg` once and commit them; add `manifest.webmanifest` (name, short name, theme `#48754d`, background,
icons). Link them in `app.html`. Brand assets are part of the design system, so the PNGs are also copied to
`design-kit/` and noted in the design system README.

**Canonical origin.** No code redirect in `hooks.server.ts`: the redirect belongs at Traefik/Dokploy, where TLS is
terminated. `deployment.md` documents the required redirects and that `ORIGIN` must be the apex HTTPS origin; the
task is to verify it with `curl -I` on the live site.

## Risks / Trade-offs

- [Static route test misses metadata added two component levels down] → Keep the one-level rule and document it in
  `web.md`: a page's `Seo` sits in the page or the component it renders.
- [Merge conflict with the home page change in progress] → Do the home page tasks last and rebase onto that change.
- [Site name change alters every title Google already shows] → Intended; titles were lowercase and inconsistent.
  Search Console will show the re-crawl within days.
- [`Course` rich results fields change over time] → Validate with the Rich Results Test at implementation time and
  follow its current required fields.
- [`published` dates guessed wrong] → They come from git history; only roughness is a few days, harmless.

## Open Questions

- Tagline wording for the home page (one short line, minimal-text rule): e.g. "Riichi mahjong online. Free, no
  downloads." To be agreed during implementation.
