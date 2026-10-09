## MODIFIED Requirements

### Requirement: Course index
`/learn` SHALL present the course by unit in curriculum order, each lesson with its title, a one-line summary and
whether it is completed, from the reader's progress (the account, or the guest's visit); it SHALL highlight the
first lesson not yet completed as the place to continue, and link to the yaku list and glossary.

#### Scenario: Returning visitor
- **WHEN** a signed-in visitor who completed the first three lessons opens `/learn`
- **THEN** those three are marked completed and the fourth is highlighted

#### Scenario: Returning guest
- **WHEN** a guest who completed lessons on an earlier visit opens `/learn`
- **THEN** no lesson is marked completed and the first lesson is highlighted

## REMOVED Requirements

### Requirement: Progress on this device
**Reason**: Progress is kept only on accounts. Guests keep it only for the visit, to give them a reason to sign up.
**Migration**: See the `account-progress` capability. Existing `riichi:learn` data is imported once and then removed.
