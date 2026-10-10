## 1. Shared SEO pieces

- [x] 1.1 Set `SITE_NAME = "Riichi Arena"` and replace every hard-coded "Riichi Arena" in `Seo.svelte`, the layout and
      JSON-LD blocks with the constant; add a `siteOrganization(origin)` helper (name, URL, logo)
- [x] 1.2 Move `Seo.svelte` from `lib/learn/components/` to `lib/components/`, add a `noindex` prop, update all
      imports (Learn, Train, reference pages, `LessonBody`, `Trainer`)
- [x] 1.3 Move the layout's default preview tags into `Title` (app pages only), so `Seo` pages never get duplicates
- [x] 1.4 Default tags in `Title`: add `og:url` (origin + pathname), `twitter:title` and a meta description
- [x] 1.5 Create `lib/seo.ts` with the robots `DISALLOW` list, the sitemap page list (moved out of the handler) and
      the `UNLISTED` map with reasons; make `robots.txt` and `sitemap.xml` handlers use it; drop `/signup` from the
      sitemap and list `/login` and `/signup` in `UNLISTED`

## 2. Route SEO test

- [x] 2.1 Write `routes/seo.test.ts`: glob `+page.svelte` files, map to route paths, and for each public route
      require `<Seo` in the page or a directly rendered `$lib` component, plus a sitemap entry (registry-backed for
      dynamic routes) or an `UNLISTED` reason, unless `noindex`
- [x] 2.2 Mutation check: remove `<Seo` from one page and one sitemap entry, confirm the test fails naming the route,
      then restore

## 3. Pages

- [x] 3.1 `/login`: render `Seo` with `noindex` (title, description, canonical)
- [x] 3.2 `/signup`: switch from `Title` to `Seo` (keeps its title and description, gains canonical and OG)
- [x] 3.3 Add `routes/+error.svelte`: `ContentShell`, status-dependent title and one-line message, links home and to
      `/learn`, `Seo` with `noindex`; check `/no-such-page` answers 404
- [x] 3.4 Remove `Title`'s `description` prop if no page uses it any more (dead code rule)

## 4. Learn structured data

- [x] 4.1 Add `published` (ISO date, from the git history of each registry entry) to `LessonMeta`; extend the
      registry test: valid date, not after `updated`
- [x] 4.2 Lesson JSON-LD: `author` and `publisher` from `siteOrganization`, `datePublished`, `image`; breadcrumb
      Learn › unit (`/learn#<unit>`) › lesson
- [x] 4.3 `/learn` `Course`: add `offers` (free) and `hasCourseInstance` (online, workload from the part count);
      validate in Google's Rich Results Test and adjust to its current required fields

## 5. Icons

- [x] 5.1 Render `icon-48.png` and `apple-touch-icon.png` (180 px) from `brand/icon.svg`; add
      `manifest.webmanifest` (name, short name, theme `#48754d`, background, icons)
- [x] 5.2 Link the PNG favicon, apple-touch icon and manifest in `app.html`; check each URL answers 200 with the right
      content type
- [x] 5.3 Copy the new icons to `design-kit/` and note them in the design system README

## 6. Home page (last: another change is editing it)

- [x] 6.1 Merge with the in-progress home page change before starting
- [x] 6.2 Replace `<Title />` with `Seo` (title and description for "play riichi mahjong online", path `/`, type
      `website`, `WebSite` + `Organization` JSON-LD); logo `h1` alt "Riichi Arena"
- [x] 6.3 Add the one-line tagline containing "riichi mahjong" under the logo (agree wording; reuse or delete the
      unused `.tag` style)

## 7. Deployment and docs

- [x] 7.1 `deployment.md`: `ORIGIN` must be the apex HTTPS origin; www→apex and http→https redirect permanently at
      Traefik/Dokploy; verify with `curl -I` against the live site and fix the proxy config if needed
- [x] 7.2 `web.md`: `Seo` location, `Title` defaults, `lib/site.ts`, `lib/seo.ts`, the route SEO test and its one-level rule
- [x] 7.3 AGENTS.md "Rules that always apply": every new or changed public page carries strong SEO (shared `Seo`,
      sitemap entry or stated reason, or disallowed/noindex), enforced by the route SEO test
- [x] 7.4 Grep for leftovers (old `Seo` path, lowercase site name in metadata, `Title` description) and remove them

## 8. Verify

- [x] 8.1 `npm test` and `npm run typecheck` pass
- [x] 8.2 Browser check on the dev server: view source of `/`, `/login`, `/learn/furiten`, `/train/waits` and a 404;
      confirm tags match the specs, no duplicate OG tags; stop the dev servers afterwards
