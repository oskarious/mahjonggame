## ADDED Requirements

### Requirement: Riichi Book I as the strategy reference, not a source text
Strategy advice in the course SHALL agree with *Riichi Book I* (Daina Chiba). Where it disagrees, the lesson SHALL
be corrected. Lessons SHALL NOT reproduce the book's text, hands, exercises, tables or figures: every hand is our
own, every explanation is in our own words, and rule facts come from the engine. The last lesson SHALL name the
book as further reading.

#### Scenario: A new strategy exercise
- **WHEN** an author adds an exercise inspired by the book
- **THEN** its hand is newly made and its answer is checked by the engine or by an engine-checked claim

### Requirement: Rules of thumb with their exceptions
Each strategy rule of thumb SHALL be taught with its condition or main exception in the same part, so it does not
turn into a bad habit:
- discard lone honors first only while the hand still needs a block; with five blocks, keep an honor as a safe tile
  and cut the useless number tile;
- most improving tiles, but prefer shapes that grow into two-sided waits;
- closed waits beat edge waits;
- choose a riichi discard by value while the hand is cheap (under about 5200) and by wait once it is worth more;
- riichi if the hand has another han, a good wait, or you are dealer; the dama exceptions are named;
- pon a value pair unless the hand stays cheap and far from tenpai;
- don't call when the hand stays cheap and slow, or drops from big to small;
- push or fold by two of three (tenpai, value, good wait), including from 1-shanten.

#### Scenario: Honors first, with the condition
- **WHEN** a reader reads the tile-efficiency part about lone honors
- **THEN** it says the order holds while a block is missing and shows a five-block hand where the honor stays

### Requirement: Building-a-hand lessons
The Building a hand unit SHALL teach, each with exercises:
- **shapes**: the ranking two-sided > closed > edge; middle tiles over 2/8 over 1/9 over honors; complex shapes
  (double closed, shape plus one, four in a row, bulging) and how many tiles each accepts; two pairs as the ideal and
  the third pair as a weak block; two two-sided shapes at 1-shanten (good-wait acceptance);
- **the five-block method**: counting blocks, five blocks (no weak block, no block over three tiles), more than five
  (drop the weakest whole block, one tile at a time), fewer than five (grow the best loose tile);
- **aiming for yaku**: which yaku are worth a small loss of acceptance (straight, triple sequence, pinfu), never a step
  back from 1-shanten; when a flush is worth it; seven pairs vs all triplets.

#### Scenario: Counting blocks
- **WHEN** a five-block lesson exercise shows a hand with six blocks
- **THEN** the correct discards are tiles of the weakest block, its tiles keep the lowest shanten, and the "why"
  names the block

### Requirement: Attack-and-defense lessons
The Attack and defense unit SHALL teach, each with exercises:
- **riichi or dama**: the three reasons to riichi, riichi as soon as tenpai, value vs wait by hand value, the dama
  exceptions (very bad wait with few live tiles, a lead in the last hand, an already big hand), and not making a hand
  with no yaku tenpai if you won't riichi;
- **defense**: genbutsu including tiles passed after riichi, suji (4–6 need both sides; the riichi tile's suji is not
  safe; early suji are more reliable), kabe (no-chance, one-chance);
- **push or fold**: two of three, the safety ranking, how safe a discard must be for your distance from tenpai, what
  to throw when no tile is safe;
- **the last hand**: placement and uma, the value needed to move up by ron, what a tsumo swings against the dealer.

#### Scenario: Push from 1-shanten
- **WHEN** a push-or-fold exercise shows a 1-shanten hand worth a mangan with only good shapes against a riichi
- **THEN** the correct answer is to push, and its claims (shanten, minimum value) are engine-checked

### Requirement: Thresholds under our rules
Thresholds taken from the book SHALL be stated as approximate ("about 5200", "about 7700"), and lessons SHALL follow
`DEFAULT_RULES` where the book's Tenhou rules differ (kiriage mangan, 2 fu for a double-wind pair, east-only games so
the last hand is East 4), with an `ema` callout where EMA tournament rules differ.

#### Scenario: The last hand
- **WHEN** the last-hand lesson describes the final hand of a default game
- **THEN** it calls it East 4 and notes that in an east-south game it is South 4
