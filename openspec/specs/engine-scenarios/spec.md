# engine-scenarios Specification

## Purpose
TBD - created by archiving change interactive-lessons. Update Purpose after archive.
## Requirements
### Requirement: Public scenario builder
The engine SHALL export a `scenario(options)` function that builds a `GameState` in the playing phase from a compact
description: concealed tiles per seat in tile notation, melds, earlier discards, the live wall from the front
(draw order), dora and ura indicators, wall size, dealer, the seat to draw first, round wind, honba, riichi sticks,
scores, seats already in riichi, and whether the hand is still uninterrupted. Seats or tiles left unspecified SHALL
be filled with tiles that keep filler hands far from tenpai. The function SHALL be pure and deterministic: the same
options always give the same state.

#### Scenario: Building a lesson position
- **WHEN** `scenario({ hands: ['123m456p789s1122z'], draws: '3z', dora: '4p' })` is called
- **THEN** it returns a playing state where seat 0 holds exactly those 13 tiles and draws 3z first, the dora
  indicator is 4p, and the other seats hold 13 filler tiles each

#### Scenario: Same input, same state
- **WHEN** `scenario` is called twice with equal options
- **THEN** both states are deeply equal

### Requirement: Invalid descriptions are rejected
`scenario` SHALL throw a descriptive error when the description cannot form a legal position: a seat with more
concealed tiles than its melds allow, a tile used more than four times (counting red fives as their copy), or more
tiles requested than exist.

#### Scenario: Too many tiles in a hand
- **WHEN** a seat with one meld is given 11 concealed tiles
- **THEN** `scenario` throws an error naming the seat and the expected count

#### Scenario: A fifth copy
- **WHEN** the options mention 1m five times across hands, discards and draws
- **THEN** `scenario` throws an error

### Requirement: Tests and lessons share the builder
The engine tests SHALL build scripted positions through the same exported `scenario` function (the test helper may
wrap it, but SHALL NOT keep its own copy of the builder).

#### Scenario: One implementation
- **WHEN** the codebase is searched for the position-building logic
- **THEN** it exists only in `packages/engine/src/scenario.ts`

