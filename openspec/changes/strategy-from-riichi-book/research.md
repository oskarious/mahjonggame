# Research: Riichi Book I as a strategy reference

Source: *Riichi Book I* by Daina Chiba (v13, 2020, CC BY-NC 3.0, written for Tenhou rules). We use it for **concepts
and decision rules**, and treat its strategy as the truth when our lessons disagree. We do not reproduce its text,
hands, exercises or tables. Every hand, figure and sentence in our lessons is our own, and every rule fact is checked
by our engine. Page numbers below are the book's printed page numbers, so authors can look things up.

## What the book teaches (condensed, in our words)

| Ch | Topic | Concepts worth teaching |
| -- | ----- | ----------------------- |
| 3 | Basics (48–83) | Choices are judged by average outcome, not by one result. Shanten levels: 1-shanten acceptance is small, so don't step back to 2-shanten unless it is tiny. Partial sets rank two-sided > closed > edge, and closed beats edge because it can grow to two-sided. Middle tiles are worth more than 2/8, then 1/9, then honors. Pair count: 2 pairs is ideal in a closed hand, a third pair is a weak block, and 4+ pairs points toward seven pairs. Perfect 1-shanten (two two-sided shapes + two pairs; left out: the definition does not add up for a 13-tile hand, use good-wait acceptance instead). Complex shapes: double-closed (135), shape-plus-one (445), four in a row (3456), bulging (3445). Wait sizes (8/4/4/4/3, 3-sided 11). |
| 4 | Five-block method (84–109) | A hand needs five blocks (four sets + a pair). With five blocks: no block weaker than a two-sided shape if avoidable, at most 3 tiles per block, and the extra tile comes from a 4-tile block. Six or more blocks: drop the weakest whole block (weigh efficiency, value and safety), one tile at a time. Fewer than five: grow the floating tile most likely to become a block (middle > 2/8 > 1/9 > honors). Common mistakes: avoiding closed shapes too much, and forcing all simples. |
| 5 | Pursuing yaku (110–137) | Speed to riichi first; plan blocks around yaku you can realistically reach. Sanshoku and ittsu are worth a small efficiency loss, never a step back in shanten. Choose pinfu's two-sided wait over a closed-wait sanshoku when the hand already has value. Honitsu is worth it only when it moves the hand to a higher value tier. Seven pairs vs all triplets. |
| 6 | Scoring (140–162) | A quick fu estimate by hand type covers most hands. |
| 7 | Riichi judgement (163–188) | Riichi if any of these holds: another han (dora counts), a good wait, or you are dealer. Riichi as soon as you are tenpai rather than waiting to improve. Choose value over wait while the hand is cheap (under about 5200), and the wait once it is worth more. A few dama cases: a very bad wait with few live tiles, a lead in the last hand, a hand already worth about 7700+, many improvements early. If you won't riichi a hand with no yaku, don't make it tenpai. |
| 8 | Defense (189–215) | Push/fold "two of three": push when at least two of (tenpai, valuable, good wait) hold, and fold when at least two of (not tenpai, cheap, bad wait) hold. Genbutsu also includes tiles the riichi player passed after declaring. Suji: 4–6 need both sides; the suji of the riichi tile is a trap; early suji are more reliable. Kabe: no-chance (4 visible) and one-chance (3 visible). A safety ranking from genbutsu down to non-suji middle tiles. How safe a discard must be depends on how close you are. Reading open hands. |
| 9 | Melding (216–234) | Don't call when the hand stays cheap and slow, or when calling drops it from big to small. Call to fill a bad shape into tenpai, to confirm a yaku, for a value pair when the hand is then fast or valuable. Rules for kans. Decide your calls before the tile comes. |
| 10 | Grand strategy (235–247) | Placement and uma. In the last hand, aim for the value that moves you up by ron from anyone. The point swing of a tsumo. Lead cushions. |

Ch 1–2 (Tenhou client, ranks) and the appendices (table manners, reading list) are out of scope.

## Rule differences to keep in mind

The book assumes Tenhou rules. Riichi Arena's `DEFAULT_RULES` are EMA 2025 plus red fives, abortive draws, bust,
riichi needing 1000 points, east-only games. Our rules have kiriage mangan (4 han 30 fu = mangan, the book counts
7700) and 2 fu for a double-wind pair (the book counts 4). The book's thresholds (5200, 7700) assume red fives, which
our default rules have, so they carry over with "roughly". Its "last hand" means South 4; for our default east-only
games that is East 4.

## Audit of the current lessons (book = truth)

Bugs:

1. `riichi/exercises.ts` `declare`: the hand `123m456p5678s9m3z` has 12 tiles. `scenario()` pads it, so no discard
   reaches tenpai, and the "why" (waiting on 5s/8s) is false. `lessons.test.ts` checks the 13-tile hand size only for
   `pick` and `choice` claims.
2. `tile-efficiency/exercises.ts` `honor`: discarding 9s and discarding 7z tie (same shanten, same ukeire), but
   `only: '7z'` marks 9s wrong. The hand already has five blocks, and there the book would keep the honor and cut the
   useless number tile.
3. `tile-efficiency/exercises.ts` `shape`: cutting 13m ties on raw ukeire with breaking a two-sided shape. The answer
   is right by the book but is enforced only by `only`.

Teaching that the book contradicts, or oversimplifies into a bad habit:

| Where | We say | The book |
| ----- | ------ | -------- |
| riichi Lesson "Declaring riichi" | pick the discard with the most winning tiles | cheap hands: value over wait; valuable hands: wait |
| riichi Lesson "The rewards" | riichi almost always | yes, plus a few dama cases; a hand with no yaku that won't riichi shouldn't be tenpai |
| tile-efficiency "Count what helps you" | keep the most tiles | most tiles, preferring shapes that grow into two-sided waits |
| tile-efficiency "Lone honors go first" | always honors, then 1/9, then 2/8 | only while you still need a block; once you have five, cut the useless number tile and keep the honor as a safe tile; throw a value honor before a guest wind in a pinfu hand |
| tile-efficiency "Cut the weakest shape" | closed and edge are equal; "more shapes than you need" | closed beats edge; "too many" means more than five blocks |
| tenpai lesson | loose tiles cost nothing | they cost little; keep one if it is your safe tile or your only way to a fifth block |
| when-to-call "Pon a value tile" | pon the first time it appears | unless the hand stays cheap and far from tenpai |
| when-to-call "simples" exercise | chii a two-sided shape into a cheap shanpon tenpai | calls are best when they fill a bad shape; never call cheap and slow |
| when-to-call "stay closed" | stay closed only when you have no yaku | a yaku is needed but not enough: the hand must be fast or valuable; don't drop from big to small |
| calling callout | open yaku: value triplets, all simples | also flushes, all triplets, straight, triple sequence |
| calling kan exercise | open kan on a hand that isn't tenpai | open kan only when tenpai with a good wait (as mechanics only, it's fine) |
| defense "When to fold" | push in tenpai with a good hand, fold when 2+ away | two of three; 1-shanten is the common case |
| defense order | genbutsu, then suji | ranking: honors seen and suji terminals above suji middle tiles; 4–6 need both sides; riichi-tile suji is a trap |
| defense / glossary genbutsu | their own discards | plus tiles passed after their riichi |
| registry defense description, glossary kabe | promises kabe; the gloss covers 4 visible only | kabe isn't taught; add one-chance |
| winning lesson "first plan" | discard 1s, 9s and honors early | forcing all simples is a named mistake; keep value pairs and plan riichi |
| glossary dealer | "pays 1.5 times as much" | wrong: on a non-dealer tsumo the dealer pays double a non-dealer's share |
| glossary han | each han doubles | roughly, up to mangan |
| waits lesson | ryanmen is "the best wait" | 3-sided waits are better; wait quality also depends on live tiles |

Rule-only differences (our lessons are right for our rules): kiriage, red fives, bust, abortive draws, the riichi
1000-point requirement (needs an `ema` callout: EMA 2025 doesn't require it), and the double-wind pair fu.
