## ADDED Requirements

### Requirement: Exercises come in sets of variants
Each exercise placed in a lesson (`<Exercise id>`) SHALL be an ordered set of at least three variants that practise the
same idea. All variants of a set SHALL have the same kind, and discard and pick variants SHALL also share the goal.
Each variant SHALL be a complete exercise (its own position, prompt and optional `why`, `show`, `expect`, `claim` or
`only`), validated against the engine exactly like a single exercise. Part text SHALL hold for every variant of the
part's set; anything specific to one hand SHALL be in that variant's prompt or `why`.

#### Scenario: A discard set
- **WHEN** the five-blocks lesson's "four blocks" set is defined
- **THEN** it has three `max-ukeire` discard variants, each a different hand with four blocks and four loose tiles

#### Scenario: Mixed kinds rejected
- **WHEN** an author adds a `choice` variant to a set of `discard` variants
- **THEN** the lesson test fails and names the lesson slug and exercise id

### Requirement: Next variant in the card
The exercise card SHALL show the set's first variant. When the shown variant is solved or revealed, and it is not the
last, the card SHALL offer a Next button right under the feedback (where the trainers put theirs) that replaces the
variant in place with the next one in its initial state, without leaving the part or changing the URL. The card SHALL
show the reader's position in the set as current/total (`2/3`) in the prompt row. After the last variant is finished
the card SHALL show no Next button. The part's step navigation SHALL stay available throughout; finishing a set is not
required to move on.

#### Scenario: Solving the first variant
- **WHEN** the reader answers the first of three variants right
- **THEN** the feedback shows with a Next button, and pressing it shows the second variant with the position at 2/3

#### Scenario: Revealing
- **WHEN** the reader reveals the answer of the second variant
- **THEN** the Next button appears, and that variant does not count as solved

#### Scenario: Last variant
- **WHEN** the reader solves the third of three variants
- **THEN** the card shows the feedback and the done state, and no Next button

### Requirement: Set solved state and progress
A variant SHALL count as solved when answered right, not when revealed. A set SHALL count as solved when all its
variants are solved; a lesson is completed when read to the end with every set solved. Device progress (`riichi:learn`)
SHALL record solved variants per lesson and exercise id. Progress stored in the previous format SHALL be kept: a
previously solved exercise id counts as its first variant solved. A set solved on an earlier visit SHALL show as done
and still start at its first variant, playable.

#### Scenario: Returning reader
- **WHEN** a reader solved all three variants of a set yesterday and opens the part again
- **THEN** the card shows as done, starting at the first variant (1/3)

#### Scenario: Old progress
- **WHEN** stored progress from before this change lists exercise `four` of `five-blocks` as solved
- **THEN** after loading, its first variant counts as solved and the other two as not solved

### Requirement: Server-rendered first variant
The server-rendered HTML SHALL contain the first variant of each set in its initial state, so search engines and
readers without JavaScript see one complete exercise per part; the other variants SHALL need scripts.

#### Scenario: No JavaScript
- **WHEN** a lesson is loaded with JavaScript disabled
- **THEN** every part shows its set's first variant and no Next button

### Requirement: Sets are validated by the lesson test
The lesson test SHALL check for every set: at least three variants, one kind (and one goal for discard and pick), and
every variant answerable with its `expect`, `claim` and `only` correct by the engine, as for single exercises today.
Variants of a set SHALL NOT repeat the same position. Failures SHALL name the lesson slug, exercise id and variant
number. The new checks SHALL be sanity-checked by planting broken sets (mutation check).

#### Scenario: Too few variants
- **WHEN** a set has two variants
- **THEN** the lesson test fails and names the lesson slug and exercise id

#### Scenario: Broken second variant
- **WHEN** the second variant of a `tenpai` discard set cannot reach tenpai
- **THEN** the lesson test fails and names the lesson slug, exercise id and variant 2
