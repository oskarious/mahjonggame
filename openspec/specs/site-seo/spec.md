# site-seo Specification

## Purpose
Site-wide search requirements outside Learn and Train: strong SEO on every public page (enforced by a route test),
home page metadata and structured data, one site name, default link-preview tags, indexing of auth and error pages,
site icons and one canonical origin.
## Requirements
### Requirement: SEO for every public page
Every public page SHALL stay strong for search through every frontend change that adds or changes it (a public page
is any route not disallowed in robots.txt and not `noindex`): server-rendered main content, a unique `<title>` and meta description written for
the query it targets, exactly one `<h1>`, a canonical URL, Open Graph and Twitter tags (through the shared `Seo`
component), JSON-LD where a schema.org type fits, descriptive link text and image alt text, and an entry in
`sitemap.xml` (or a stated reason in the sitemap code for leaving it out). A route that should not be indexed SHALL
be disallowed in robots.txt or carry `noindex`. A test SHALL check every route directory against these rules, so a new
page without them fails `npm test`.

#### Scenario: New page without metadata
- **WHEN** a developer adds `routes/rules/+page.svelte` without using `Seo`, without a sitemap entry and without
  being disallowed or `noindex`
- **THEN** the route SEO test fails and names the route

#### Scenario: New app-only page
- **WHEN** a developer adds an app-only route and disallows it in robots.txt
- **THEN** the route SEO test passes without metadata or a sitemap entry

### Requirement: Home page metadata
The home page SHALL have its own `<title>` and meta description written for "play riichi mahjong online", a canonical
URL on the production origin (no query string), Open Graph and Twitter card tags (title, description, image, URL), a
visible text tagline containing the words "riichi mahjong" next to the logo, and JSON-LD `WebSite` (name, URL) and
`Organization` (name, URL, logo) data. The logo image SHALL stay the page's single `<h1>`.

#### Scenario: Home page crawled
- **WHEN** a crawler fetches `/?ref=newsletter`
- **THEN** the HTML has the home title and description, `<link rel="canonical">` pointing to the origin's `/`,
  `og:url`/`og:title`/`og:description`/`og:image`, one `h1`, a tagline mentioning riichi mahjong, and valid `WebSite`
  and `Organization` JSON-LD

### Requirement: One site name
Every `<title>` suffix, `og:site_name` and JSON-LD `name`/`publisher`/`provider` of the site SHALL use the same
string, "Riichi Arena", taken from a single constant. The lowercase wordmark SHALL remain a visual treatment only.

#### Scenario: Names agree
- **WHEN** the HTML of `/`, `/learn/furiten` and `/train/waits` is inspected
- **THEN** each title ends with "Riichi Arena" and every `og:site_name` and JSON-LD organization name is exactly
  "Riichi Arena"

### Requirement: Default link-preview tags
A page without its own metadata SHALL still carry a meta description and `og:url`, `og:title`, `og:description`,
`og:image`, `twitter:card` and `twitter:title`, with `og:url` the page's own URL without query string. A page that
brings its own metadata SHALL NOT also get the defaults (no duplicate tags).

#### Scenario: Login page preview
- **WHEN** the HTML of `/login` is inspected
- **THEN** it has exactly one `og:url` (the `/login` URL) and exactly one `og:title`

### Requirement: Indexing of auth and error pages
`/login` SHALL carry `<meta name="robots" content="noindex">`. Error pages SHALL be rendered by a site error page
with a title, a short message and links to the home page and `/learn`, SHALL carry `noindex`, and SHALL keep the
error's HTTP status. `/signup` SHALL stay indexable but SHALL NOT be in the sitemap.

#### Scenario: Unknown page
- **WHEN** a visitor opens `/no-such-page`
- **THEN** the site answers 404 with the site error page, which links home and to `/learn` and has a `noindex` meta tag

#### Scenario: Login not indexed
- **WHEN** the HTML of `/login` is inspected
- **THEN** it has a `noindex` robots meta tag

### Requirement: Site icons
Every page SHALL link the SVG favicon, a 48×48 PNG favicon, a 180×180 `apple-touch-icon` and a web app manifest
naming the site, its theme color and the icons. The icons SHALL use the brand's four-seats mark.

#### Scenario: Icons served
- **WHEN** the home page's `<head>` is inspected and each icon URL fetched
- **THEN** the SVG, PNG and apple-touch icons and the manifest all answer 200 with the right content type

### Requirement: One canonical origin
Canonical URLs, `og:url`, sitemap and robots URLs SHALL use the production origin (`ORIGIN`). In production, requests
to the `www` host and over plain HTTP SHALL redirect permanently to the canonical origin, and the deployment docs SHALL
say so.

#### Scenario: www visitor
- **WHEN** a visitor requests `http://www.<domain>/learn`
- **THEN** they are redirected with a 301 or 308 to `https://<domain>/learn`

