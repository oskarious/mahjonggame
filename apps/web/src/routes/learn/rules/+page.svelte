<script lang="ts">
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import T from '$lib/learn/components/T.svelte';
  import Tiles from '$lib/learn/components/Tiles.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { COURSE_NAME, REFERENCE } from '$lib/learn/registry';
  import { OG_IMAGE, siteOrganization } from '$lib/site';

  const ref = REFERENCE.rules;
  /** First published and last content change (JSON-LD), YYYY-MM-DD. */
  const PUBLISHED = '2026-10-10';
  const UPDATED = '2026-10-10';

  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: ref.seoTitle,
      description: ref.description,
      url: origin + ref.path,
      datePublished: PUBLISHED,
      dateModified: UPDATED,
      image: origin + OG_IMAGE,
      inLanguage: 'en',
      isPartOf: { '@type': 'Course', name: COURSE_NAME, url: `${origin}/learn` },
      author: siteOrganization(origin),
      publisher: siteOrganization(origin),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Learn', item: `${origin}/learn` },
        { '@type': 'ListItem', position: 2, name: ref.title, item: origin + ref.path },
      ],
    },
  ]);
</script>

<Seo title={ref.seoTitle} description={ref.description} path={ref.path} {jsonld} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/learn">Learn</a> › Reference</nav>
<h1>Riichi mahjong rules</h1>
<p>
  Mahjong is a four-player tile game from China. Riichi mahjong is its Japanese form; American and Chinese mahjong use
  other rules. This page is the whole game in short, following the EMA Riichi Rules 2025. Each part links to the lesson
  that teaches it, with hands you play in the page.
</p>

<section id="tiles">
  <h2>The tiles</h2>
  <p>
    136 tiles: three suits numbered 1 to 9 (man, pin and sou), four winds and three dragons, four copies of each. 1s and
    9s are terminals; winds and dragons are honors.
  </p>
  <Tiles t="123456789m" />
  <Tiles t="123456789p" />
  <Tiles t="123456789s" />
  <Tiles t="1234z 567z" caption="Man, pin, sou; winds and dragons" />
  <a class="more" href="/learn/tiles">The tiles →</a>
</section>

<section id="winning-hand">
  <h2>A winning hand</h2>
  <p>
    You hold 13 tiles and win with 14: four sets and a pair. A set is a sequence (three in a row in one suit) or a
    triplet (three of a kind). Seven pairs and thirteen orphans are the two hands with another shape.
  </p>
  <Tiles t="123m 456p 789s 555z 22m" caption="Four sets and a pair" />
  <a class="more" href="/learn/sets-and-winning-hands">Sets and winning hands →</a>
</section>

<section id="turn">
  <h2>A turn</h2>
  <p>
    Each player has a seat wind; East is the dealer. Play goes counter-clockwise: draw a tile from the wall, then
    discard one face up in your river. The wall's last 14 tiles, the dead wall, are not drawn; one of them is turned up
    as the dora indicator. A deal ends when someone wins or the wall runs out.
  </p>
  <a class="more" href="/learn/table-and-turns">The table and a turn →</a>
</section>

<section id="calls">
  <h2>Calling a discard</h2>
  <p>
    Take another player's discard to complete a set: pon for a triplet (from anyone), chii for a sequence (only from the
    player on your left), kan for four of a kind. A kan draws a replacement tile and turns up a new dora indicator. A
    win beats every call; pon and kan beat chii. A call opens your hand: no riichi, and some yaku are lost.
  </p>
  <a class="more" href="/learn/calling">Chii, pon and kan →</a>
</section>

<section id="winning">
  <h2>Winning: tsumo and ron</h2>
  <p>
    One tile from a winning hand you are in tenpai. Win by drawing the tile (tsumo) or on another player's discard
    (ron). Every win needs at least one yaku, a scoring pattern. You can't ron on a tile you discarded yourself
    (furiten), but you can still win by tsumo.
  </p>
  <Tiles t="234m 678p 345s 55p 34s" win="5s" caption="All simples (tanyao) is a yaku: this hand wins by tsumo or ron" />
  <a class="more" href="/learn/winning">How to win →</a>
  <a class="more" href={REFERENCE.yaku.path}>Every yaku →</a>
</section>

<section id="riichi">
  <h2>Riichi</h2>
  <p>
    With a closed hand in tenpai you can declare riichi: put up a 1000-point stick and discard. Riichi is a yaku, so it
    makes almost any closed hand winnable, but your hand is locked from then on. Win within one go-around for ippatsu,
    and a riichi winner adds ura dora.
  </p>
  <a class="more" href="/learn/riichi">How to declare riichi →</a>
</section>

<section id="dora">
  <h2>Dora</h2>
  <p>
    The dora is the tile after the indicator: indicator <T t="3p" /> makes <T t="4p" /> the dora. Each dora in a winning hand
    adds 1 han, but dora are not a yaku. Riichi Arena also counts each red five as a dora; EMA tournaments play without them.
  </p>
  <a class="more" href="/learn/dora">Dora →</a>
</section>

<section id="scoring">
  <h2>Scoring</h2>
  <p>
    A hand's value is its han (from yaku and dora) and fu (from its shape); each han roughly doubles it. From 5 han the
    score is a fixed limit: mangan 8000, up to yakuman 32000. The dealer wins 1.5 times as much. On ron the discarder
    pays it all; on tsumo everyone pays a share.
  </p>
  <p>
    Each counter adds 300 to the next win, and the winner takes the riichi sticks on the table. If the wall runs out,
    players not in tenpai pay those in tenpai 3000 in total.
  </p>
  <a class="more" href="/learn/han-and-fu">Han, fu and the score table →</a>
  <a class="more" href="/learn/payments-and-draws">Payments and draws →</a>
</section>

<section id="game-end">
  <h2>How a game ends</h2>
  <p>
    Everyone starts with 30,000 points. Each player deals in turn; the dealer deals again after a win or tenpai at a
    draw. Tournaments play two rounds (East and South); Riichi Arena's standard game is East only and ends early when a
    player drops below zero. At the end, placement bonuses (uma) of +15,000, +5,000, -5,000 and -15,000 are added.
  </p>
  <a class="more" href="/learn/ending-a-game">How a game ends →</a>
</section>

<Cta />

<style>
  .crumbs {
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .crumbs a {
    color: var(--ink-dim);
  }
  section {
    scroll-margin-top: 64px;
  }
  .more {
    display: inline-block;
    margin: 0 14px 4px 0;
    font-size: 0.9rem;
  }
</style>
