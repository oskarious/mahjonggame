# lesson-curriculum Specification

## Purpose
TBD - created by archiving change interactive-lessons. Update Purpose after archive.
## Requirements
### Requirement: Course from the first tile to scoring
The course SHALL cover, in this order of units and lessons (slugs indicative, each targeting a search query):

1. **Basics**: how to play riichi mahjong (the goal, four players, a winning hand shown first); the tiles (man / pin /
   sou with their English glosses, winds, dragons, numbers, simples / terminals / honors, red fives, the notation
   used on the site); sets and a winning hand (sequence, triplet, quad, pair; seven pairs and thirteen orphans as
   exceptions); the table and a turn (seats, dealer, wall, dead wall, dora indicator, draw and discard, the river);
   calling (chii only from the left, pon and kan from anyone, call priority, open vs closed); winning (tsumo and ron,
   a yaku is required).
2. **Reading your hand**: tenpai and shanten; wait shapes (ryanmen, kanchan, penchan, shanpon, tanki, multi-sided);
   furiten (discard, temporary, riichi furiten; tsumo still allowed).
3. **Yaku**: your first yaku (riichi, menzen tsumo, tanyao, yakuhai, pinfu); riichi in detail (conditions, deposit,
   locked hand, ippatsu, ura dora); dora (indicator → next tile with wrap-around, kan dora, ura dora, red fives, dora
   are not yaku); more yaku (iipeikou, chiitoitsu, honitsu, toitoi, ittsu, sanshoku, chanta and others, closed-only
   yaku and yaku worth less when open); and the yaku list page.
4. **Scoring**: han and fu (base points, limits mangan to yakuman, dealer ×1.5, ron vs tsumo payments, the score
   table); counting fu (step by step, fixed cases pinfu tsumo and seven pairs, a quick estimate by hand type);
   payments and draws (honba, riichi sticks, exhaustive draw and noten payments, dealer repeat, abortive draws);
   ending a game (east-only and east-south games, final placement, uma, bankruptcy).
5. **Building a hand**: tile efficiency (ukeire, which loose tile to cut and when); shapes (shape ranking, complex
   shapes, pairs, good waits); the five-block method; aiming for yaku; when to call.
6. **Attack and defense**: riichi or dama; defense (genbutsu, suji, kabe and one-chance); push or fold (two of three,
   the safety ranking, how safe a discard must be); the last hand (placement, the value you need, tsumo swings).

Plus the glossary page. Each lesson SHALL have at least one exercise unless its topic is purely descriptive, and the
course as a whole SHALL use every exercise kind. Only the last lesson of the course SHALL say the course is complete.

#### Scenario: Index order
- **WHEN** the lesson registry is loaded
- **THEN** it lists the units and lessons in the order above

#### Scenario: Interactive coverage
- **WHEN** the lesson test inspects the registry
- **THEN** every exercise kind is used somewhere, and every lesson without an exercise is marked descriptive

#### Scenario: End of the course
- **WHEN** a reader finishes the defense lesson
- **THEN** it leads on to push or fold instead of saying the course is complete

### Requirement: Rules taught
Lessons SHALL teach the rules played on Riichi Arena (the engine's `DEFAULT_RULES`, based on EMA Riichi Rules 2025),
and SHALL state in a clearly marked note where EMA tournament rules (`EMA_2025`) or common online rules differ
(red fives, abortive draws, game length, bankruptcy, riichi with points). Rule facts in exercises SHALL come from the
engine using those rules.

#### Scenario: Red fives
- **WHEN** the tiles lesson introduces red fives
- **THEN** it says they are used on Riichi Arena and notes that EMA tournament rules play without them

### Requirement: Terminology
Lessons SHALL use the Japanese romaji term as the main term (pon, chii, kan, tsumo, ron, riichi, tenpai, furiten,
yaku, han, fu, dora) with an English gloss on first use in each lesson, use the same spelling everywhere (as in the
glossary), and give suits as man / pin / sou glossed as characters / circles / bamboo.

#### Scenario: First use
- **WHEN** a lesson first mentions "kanchan"
- **THEN** it is followed by an English gloss ("closed wait") and links to the glossary

### Requirement: Address common beginner confusions
The course SHALL explicitly cover the top beginner confusions, each with an exercise: a complete hand that cannot
win because it has no yaku (especially after calling); furiten covering the whole hand; calling losing riichi and
pinfu; tenpai not needing a yaku while winning does.

#### Scenario: No-yaku trap
- **WHEN** a reader works through the winning and calling lessons
- **THEN** each has a `can-win` exercise where an open, complete hand without a yaku cannot win

