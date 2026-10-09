# elo-ranks Specification

## Purpose
TBD - created by archiving change elo-ranks. Update Purpose after archive.
## Requirements
### Requirement: Rank table
The system SHALL define a single ordered table of ranks. Each rank SHALL have a stable id, a display name and a
minimum rating (inclusive). Ranks SHALL be ordered from lowest to highest minimum, the lowest rank SHALL have no lower
bound, and the spans SHALL be contiguous with no gaps or overlaps. The initial table SHALL be:

| id       | name     | rating span    |
| -------- | -------- | -------------- |
| iron     | Iron     | below 625      |
| bronze   | Bronze   | 625 – 874      |
| silver   | Silver   | 875 – 1124     |
| gold     | Gold     | 1125 – 1374    |
| platinum | Platinum | 1375 – 1624    |
| diamond  | Diamond  | 1625 – 1874    |
| master   | Master   | 1875 and above |

The spans are offset so that the starting rating (1000) sits in the middle of a rank, not on a boundary.

#### Scenario: Table is contiguous and ordered
- **WHEN** the rank table is read
- **THEN** each rank's minimum is greater than the previous rank's minimum and every rating falls in exactly one rank

### Requirement: Sub-ranks
Every rank SHALL be split into five sub-ranks numbered 1 to 5, where 1 is the lowest and 5 the highest. Each sub-rank
SHALL span 50 rating points, measured from the lower bound of the rank above: sub-rank 5 is the top 50 points below the
next rank, sub-rank 4 the 50 below that, and so on. For the top rank (no upper bound), sub-rank 1 SHALL start at the
rank's minimum and sub-rank 5 SHALL be unbounded above. For the lowest rank (no lower bound), sub-rank 1 SHALL be
unbounded below. A higher sub-rank of the same rank SHALL always mean a higher rating.

| rank   | 1          | 2           | 3           | 4           | 5           |
| ------ | ---------- | ----------- | ----------- | ----------- | ----------- |
| Iron   | below 425  | 425 – 474   | 475 – 524   | 525 – 574   | 575 – 624   |
| Silver | 875 – 924  | 925 – 974   | 975 – 1024  | 1025 – 1074 | 1075 – 1124 |
| Master | 1875 – 1924 | 1925 – 1974 | 1975 – 2024 | 2025 – 2074 | 2075 and above |

#### Scenario: Iron 1 is below Iron 3
- **WHEN** the ranks for ratings 400 and 500 are requested
- **THEN** the results are Iron 1 and Iron 3

#### Scenario: Sub-rank boundary
- **WHEN** the ranks for ratings 924 and 925 are requested
- **THEN** the results are Silver 1 and Silver 2

#### Scenario: Top of a rank
- **WHEN** the rank for rating 1124 is requested
- **THEN** the result is Silver 5

#### Scenario: Unbounded top sub-rank
- **WHEN** the rank for rating 2400 is requested
- **THEN** the result is Master 5

### Requirement: Rating to rank lookup
The system SHALL provide one shared pure function that takes a rating and returns its rank and sub-rank, plus a
display label of the form "<name> <sub-rank>" (e.g. "Silver 3"), usable from both the web app and the game server. A
rating SHALL belong to the highest rank whose minimum is less than or equal to it.

#### Scenario: Rating inside a span
- **WHEN** the rank for rating 700 is requested
- **THEN** the result is Bronze 2, labelled "Bronze 2"

#### Scenario: Rating exactly on a rank boundary
- **WHEN** the rank for rating 625 is requested
- **THEN** the result is Bronze 1 (the lower bound is inclusive)

#### Scenario: Rating just below a rank boundary
- **WHEN** the rank for rating 624 is requested
- **THEN** the result is Iron 5

#### Scenario: Starting rating
- **WHEN** the rank for the starting rating of 1000 is requested
- **THEN** the result is Silver 3

#### Scenario: A new player's first loss keeps their rank
- **WHEN** a new player at 1000 finishes last in their first rated game (at most −40 with K 40)
- **THEN** their rank is still Silver (sub-rank 2 or 3)

### Requirement: Out-of-range and fractional ratings
The lookup SHALL return a rank for every number: ratings below 0 SHALL map into the lowest rank, fractional ratings
SHALL be compared as-is against the boundaries, and a non-finite value (NaN) SHALL map to the lowest rank's sub-rank 1
instead of throwing.

#### Scenario: Negative rating
- **WHEN** the rank for rating -30 is requested
- **THEN** the result is Iron 1

#### Scenario: Fractional rating
- **WHEN** the rank for rating 874.6 is requested
- **THEN** the result is Bronze 5

#### Scenario: NaN
- **WHEN** the rank for NaN is requested
- **THEN** the result is Iron 1

### Requirement: Rank badge with pluggable icons
The web app SHALL provide one reusable rank badge component that takes a rating and shows the rank icon together
with the rating number. Every place that shows a player's rating SHALL use it. Rank icons SHALL
be pluggable by adding image files only, with no code change: one icon per sub-rank (`<sub>.svg`, e.g. `3.svg`),
shared by all ranks. The badge SHALL tint the icon with the rank's colours, mapping the icon's fills from dark to light
onto the rank's dark, mid and light shades, and SHALL show a placeholder when the sub-rank has no icon. The badge SHALL
always expose the full label (e.g. "Silver 3") to assistive technology.

#### Scenario: No icons yet
- **WHEN** a badge is shown for rating 1000 and no icon files exist
- **THEN** it shows the placeholder for Silver 3 and its accessible name is "Silver 3"

#### Scenario: Sub-rank icon added
- **WHEN** `3.svg` is added and badges are shown for ratings 1000 (Silver 3) and 1250 (Gold 3)
- **THEN** both show the `3.svg` shape, one in Silver's colours and one in Gold's

#### Scenario: Icon only for some sub-ranks
- **WHEN** only `3.svg` exists and a badge is shown for rating 1100 (Silver 5)
- **THEN** it shows the placeholder

#### Scenario: Shades follow the art
- **WHEN** an icon is drawn with three fills
- **THEN** its darkest fill shows the rank's dark shade, the middle one the mid shade and the lightest the light shade

### Requirement: Ranks are derived, not stored
Ranks and sub-ranks SHALL NOT be persisted or sent as separate fields; any consumer holding a rating SHALL derive them
with the shared function.

#### Scenario: Rating changes after a game
- **WHEN** a player's rating moves from 1115 to 1132 after a rated game
- **THEN** their rank goes from Silver 5 to Gold 1 with no stored data changing other than the rating

