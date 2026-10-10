/** The site's name in titles, link previews and structured data (the lowercase wordmark is only a visual treatment). */
export const SITE_NAME = 'Riichi Arena';

/** The default description, for pages without their own. */
export const SITE_DESCRIPTION = 'Play riichi mahjong online: rated games, bots, lessons and trainers. Free, no downloads.';

/** Shared link-preview image (1200×630). */
export const OG_IMAGE = '/brand/og.png';

/** The site as a schema.org organization, for `author`, `publisher` and `provider`. */
export const siteOrganization = (origin: string) => ({
  '@type': 'Organization',
  name: SITE_NAME,
  url: origin,
  logo: `${origin}/brand/icon-512.png`,
});
