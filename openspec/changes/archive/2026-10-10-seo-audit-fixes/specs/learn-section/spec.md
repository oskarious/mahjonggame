## MODIFIED Requirements

### Requirement: Search engine metadata
Every Learn page SHALL have a unique `<title>` and meta description written for the query it targets, exactly one
`<h1>`, section headings in order (`<h2>`, `<h3>`), a canonical URL on the production origin, Open Graph and Twitter
card tags (title, description, image, URL), and JSON-LD structured data: on `/learn`, `Course` with a provider,
`offers` (free) and a `hasCourseInstance` (online, self-paced), as Google's course rich results require, and without
`hasPart`/`isAccessibleForFree` (Google reads that pair as paywall markup); on lesson pages, `Article` (or `LearningResource`) with `author` (the site organization), `datePublished` (from the
lesson registry), `dateModified` and `image`, plus a `BreadcrumbList` of Learn › unit › lesson matching the visible
breadcrumb. Text alternatives of tile figures SHALL name the tiles in words (e.g. "1, 2 and 3 of characters").

#### Scenario: Lesson metadata
- **WHEN** the HTML of `/learn/furiten` is inspected
- **THEN** it has its own title and description, one `h1`, a canonical link, `og:title`/`og:description`/`og:image`,
  valid `Article` JSON-LD with `author`, `datePublished` and `image`, and a three-item `BreadcrumbList`

#### Scenario: Course data complete
- **WHEN** the `/learn` JSON-LD is checked with Google's Rich Results Test
- **THEN** the `Course` has no missing required fields and no Paywalled Content item is detected

#### Scenario: No duplicate titles
- **WHEN** the titles and descriptions of all Learn pages are compared
- **THEN** no two are equal

### Requirement: Discoverable by search engines
The site SHALL serve `/robots.txt` and `/sitemap.xml`. The sitemap SHALL list the home page, `/learn`, every lesson,
the yaku list and the glossary, generated from the lesson registry, so a new lesson appears without editing the
sitemap by hand. `/admin`, `/account`, `/online` and the auth API SHALL be disallowed in robots.txt and left out of
the sitemap, and the sign-in and sign-up pages SHALL be left out of the sitemap. The home page SHALL link to `/learn`
for every visitor.

#### Scenario: New lesson added
- **WHEN** a lesson is added to the registry and the site is built
- **THEN** `/sitemap.xml` contains its URL and `/learn` lists it

#### Scenario: Form pages not listed
- **WHEN** `/sitemap.xml` is fetched
- **THEN** it contains neither `/login` nor `/signup`
