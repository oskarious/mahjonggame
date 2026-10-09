# strategy-exercises Specification

## Purpose
TBD - created by archiving change strategy-from-riichi-book. Update Purpose after archive.
## Requirements
### Requirement: Judgment discards
A `discard` exercise SHALL be able to name its correct discard(s) directly, for rules the engine cannot decide
alone (five blocks, keeping a safe tile, value over speed). Every named discard SHALL keep the lowest shanten
reachable, unless the exercise explicitly marks it as a deliberate step back. Feedback for any discard SHALL still
show the engine's numbers for that discard (shanten, improving tiles and their count), so the reader sees what the
chosen rule trades.

#### Scenario: Keeping the honor
- **WHEN** a five-block hand's judgment discard is a useless 2 and the reader discards a lone honor that has the same
  ukeire
- **THEN** the answer is marked wrong, the feedback shows that both keep the same tiles, and the authored "why"
  explains the safe-tile reason

#### Scenario: A step back by mistake
- **WHEN** an author names a judgment discard that leaves the hand further from tenpai than the best discard, without
  marking it as a step back
- **THEN** the lesson test fails and names the lesson and exercise

### Requirement: Good-wait acceptance
The system SHALL compute, for a 1-shanten hand, the tiles that reach tenpai with a good wait (two-sided or better: a
wait that can still come in at least 5 copies, counting every copy not in the own hand), and a `discard` goal SHALL
maximise it among the discards that keep the lowest shanten.

#### Scenario: Two-sided over edge
- **WHEN** a hand can drop either an edge shape or a tile from a two-sided shape with equal raw ukeire
- **THEN** the good-wait goal accepts only the discard that keeps the two-sided shape

### Requirement: Safety grades
The system SHALL grade each tile kind for safety against a given riichi seat from public information only, in this
order from safest:
1. genbutsu: in the riichi player's river, or discarded by anyone after their riichi without them winning on it;
2. honors with no copy left that the reader cannot see; terminals that are suji; tiles made no-chance by walls;
3. suji 2/8; 4/5/6 with both suji sides discarded; honors with one unseen copy left;
4. suji 3/7; one-chance tiles; honors with two unseen copies left;
5. honors with three unseen copies left (nobody has discarded one); non-suji terminals;
6. non-suji 2/8;
7. non-suji 3/7 and 4/5/6 with only one suji side discarded;
8. non-suji 4/5/6.

A tile matching several grades SHALL take the safest. The grades SHALL never use hidden information (other hands,
the wall).

#### Scenario: Suji middle tile needs both sides
- **WHEN** the riichi player has discarded 2p but not 8p
- **THEN** 5p is graded as a middle tile with one suji side, not as suji

#### Scenario: Passed after riichi
- **WHEN** the player across discards 7s after the riichi and the riichi player does not win on it
- **THEN** 7s is graded genbutsu against the riichi player

### Requirement: Safety goals
A `discard` exercise SHALL support the goal "the safest tile against seat N": every hand tile in the best grade
present is correct. A `pick` exercise SHALL support the goal "no-chance tiles": the kinds that cannot complete a
two-sided wait because the tile between them has all four copies visible.

#### Scenario: Several equally safe tiles
- **WHEN** the hand holds two genbutsu tiles
- **THEN** either is accepted

#### Scenario: No-chance pick
- **WHEN** all four 7m are visible and the reader is asked for the no-chance tiles
- **THEN** 8m and 9m are correct, and so is any other tile walled the same way

### Requirement: Decision claims
A `choice` exercise about a decision (riichi or dama, push or fold, call or not) SHALL be able to state facts about
its position that its answer relies on: tenpai, shanten, the number of live winning tiles, whether the wait is good,
and the minimum ron value of the hand without riichi. The lesson test SHALL check each stated fact against the
engine.

#### Scenario: Wrong value claim
- **WHEN** a riichi-or-dama question claims the hand is worth at least 7700 by ron but its cheapest win is 5200
- **THEN** the lesson test fails and names the lesson and exercise

