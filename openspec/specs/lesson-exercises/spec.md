# lesson-exercises Specification

## Purpose
TBD - created by archiving change interactive-lessons. Update Purpose after archive.
## Requirements
### Requirement: Exercises are slices of the game
An exercise SHALL show a position built with the engine's `scenario` through the real play-screen components (hand
strip, own panel with drawn tile and dora, call buttons, and, when the exercise asks for them, ponds, melds, riichi
markers and scores), with the game's own input and visual language: flick up or click to discard, press or hover to
inspect with the magnifier. Parts of the table the exercise does not ask for SHALL NOT be shown. Each exercise SHALL
have a stable id, a short prompt and exactly one task.

#### Scenario: Discard on a phone
- **WHEN** a discard exercise is shown on a portrait phone and the reader flicks a hand tile up
- **THEN** the tile is taken as the answer, exactly as a discard in a game

#### Scenario: Discard with a mouse
- **WHEN** a discard exercise is shown on a desktop and the reader clicks a hand tile
- **THEN** the tile is taken as the answer

### Requirement: Exercise kinds
The following exercise kinds SHALL be supported:
- `discard`: discard one tile, with a goal (reach tenpai, reduce shanten, maximise ukeire, maximise good-wait
  acceptance, safe against a riichi, the safest tile against a riichi, or an authored judgment discard);
- `pick`: select one or more tile kinds from the hand or an offered row (all waits, the dora, the tile that completes
  a set, all tiles of a suit, the no-chance tiles);
- `call`: answer a call window (Ron, Pon, Chii, Kan or Pass);
- `can-win`: decide whether the shown winning tile can be won on, and if not, why (no yaku, furiten, not complete);
- `yaku`: select every yaku a complete hand has from a list;
- `score`: choose the value of a complete hand (han and fu, or points) from options;
- `fu`: build the fu of a hand step by step, choosing each part (base, closed ron / tsumo, each set, the pair, the
  wait) before seeing the rounded total;
- `choice`: a multiple-choice question whose answer is authored, for decisions the engine cannot judge, with
  optional engine-checked claims about the shown position.

#### Scenario: Fu builder
- **WHEN** a reader works through a `fu` exercise for a closed ron hand with a concealed triplet of 9p and a kanchan
  wait
- **THEN** they are asked in turn for the base 20, closed ron +10, the triplet +8 and the wait +2, and then shown the
  total 40 fu

### Requirement: Answers are decided by the engine
For every kind except `choice`, the correct answers SHALL be computed by engine functions (`analyzeDiscards`,
`waits`, `legalActions`, `scoreHand` and its fu parts, `limitFor`, payment functions, genbutsu from public discards)
on the exercise's position, not listed by hand. An exercise MAY restrict the correct answers to an explicit list
when the lesson teaches one specific choice, but every listed answer SHALL also be correct by the engine.

#### Scenario: Several right discards
- **WHEN** the goal is "tenpai" and two different discards each leave the hand tenpai
- **THEN** both are accepted

#### Scenario: Waits picked by the engine
- **WHEN** a pick exercise asks for all waits of a hand waiting on 1p, 4p and 7p
- **THEN** exactly {1p, 4p, 7p} is correct

#### Scenario: Can you win
- **WHEN** a `can-win` exercise shows a complete open hand with no yaku and a ron tile
- **THEN** the correct answer is "no, no yaku"

### Requirement: Feedback per answer
A correct answer SHALL be confirmed with a short explanation (engine-filled, plus an optional authored line). A wrong
answer SHALL be explained with engine results where possible (tiles away after that discard, the waits it would have
had, which picks are wrong or missing, the yaku or fu part that was miscounted), SHALL leave the exercise open for
another try, and SHALL offer to reveal the answer. Feedback SHALL appear in a reserved area so the slice never moves.

#### Scenario: Wrong discard toward tenpai
- **WHEN** the goal is "tenpai" and the reader discards a tile that leaves the hand one tile away from tenpai
- **THEN** the feedback says so, the slice stays in place and the reader can try again

#### Scenario: Reveal
- **WHEN** the reader has answered wrong and chooses to reveal
- **THEN** the correct answers are marked and the exercise counts as seen but not solved

### Requirement: Server-rendered initial state
Each exercise SHALL render on the server in its initial state (prompt, tiles and choices visible as static HTML) and
become interactive after hydration; until then it SHALL NOT shift the page layout.

#### Scenario: No JavaScript
- **WHEN** a lesson is loaded with JavaScript disabled
- **THEN** each exercise shows its prompt and position, and only the interaction is missing

### Requirement: Every exercise and lesson is validated by a test
A test SHALL load every lesson and check: every exercise position builds; seat 0's hand in every exercise position
has the right size as written, before any padding by `scenario()` (13 tiles minus 3 per meld, plus the drawn tile on
its own turn); the task is possible in it (legal discard or call for the shown seat, offered rows contain the
answers, a complete hand for `yaku` / `score` / `fu`); the engine finds at least one correct answer; explicit answer
lists are correct by the engine; judgment discards keep the lowest shanten; every claim holds by the engine;
`choice` exercises have exactly one marked answer; exercise ids are unique per lesson; every exercise placed in a
lesson exists and every defined exercise is placed. Failures SHALL name the lesson slug and exercise id. The test
SHALL be sanity-checked by planting broken lessons (mutation check).

#### Scenario: A broken exercise
- **WHEN** an author writes a "tenpai" discard exercise whose hand cannot reach tenpai
- **THEN** the test fails and names the lesson slug and exercise id

#### Scenario: A hand one tile short
- **WHEN** a discard exercise lists 12 hand tiles plus a drawn tile for a hand without melds
- **THEN** the test fails on the hand size instead of letting `scenario()` pad it

