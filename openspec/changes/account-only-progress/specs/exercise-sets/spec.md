## MODIFIED Requirements

### Requirement: Set solved state and progress
A variant SHALL count as solved when answered right, not when revealed. A set SHALL count as solved when all its
variants are solved; a lesson is completed when read to the end with every set solved. The reader's progress (the
account, or the guest's visit) SHALL record solved variants per lesson and exercise id. Imported device progress in
the previous format SHALL be kept: a previously solved exercise id counts as its first variant solved. A set solved
on an earlier visit SHALL show as done and still start at its first variant, playable.

#### Scenario: Returning reader
- **WHEN** a signed-in reader solved all three variants of a set yesterday and opens the part again
- **THEN** the card shows as done, starting at the first variant (1/3)

#### Scenario: Old progress
- **WHEN** imported device progress in the old format lists exercise `four` of `five-blocks` as solved
- **THEN** after loading, its first variant counts as solved and the other two as not solved
