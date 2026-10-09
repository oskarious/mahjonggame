## MODIFIED Requirements

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
