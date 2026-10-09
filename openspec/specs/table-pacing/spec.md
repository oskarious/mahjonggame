# table-pacing Specification

## Purpose
TBD - created by archiving change table-countdowns-and-timers. Update Purpose after archive.
## Requirements
### Requirement: Turn timer defaults
In online games, a human's own-turn decision SHALL have a base time of 5 s and a call decision a base time of 5 s.
Every seat SHALL have a time bank of 20 s, reset at the start of every hand. Time used beyond the base time SHALL come
out of the bank; when both are exhausted the server SHALL play the engine's timeout action. All of these values SHALL
be server configuration.

#### Scenario: Quick discard
- **WHEN** a player discards within 5 s on a normal turn
- **THEN** their time bank is unchanged

#### Scenario: Slow discard
- **WHEN** a player discards 8 s into a normal turn
- **THEN** 3 s are deducted from their time bank

#### Scenario: Bank refilled
- **WHEN** a new hand is dealt
- **THEN** every seat's time bank is 20 s again

### Requirement: Dealer's opening decision
The dealer's first decision of a hand, taken before anyone has discarded in that hand, SHALL have a base time of 10 s
instead of the normal own-turn base time. The time bank SHALL come on top as usual.

#### Scenario: Opening discard
- **WHEN** the countdown of a new hand ends and the dealer is to discard
- **THEN** the dealer's deadline is 10 s plus their time bank

#### Scenario: Later turns
- **WHEN** the dealer's next turn in the same hand comes up after other players have discarded
- **THEN** the normal 5 s own-turn base time applies

### Requirement: Countdown before play
In every paced online game (with or without human seats), a countdown SHALL run before play starts in each hand: 5 s
after the game's first deal, 3 s after every later deal. The next hand is dealt once the hand result is confirmed (see "Bots confirm
hand results"); the 3 s countdown starts when that deal happens. During a
countdown every connected player SHALL see their newly dealt hand and the remaining countdown, no seat (human or bot) SHALL be
able to act, and no decision timer SHALL run. When the countdown ends, the dealer's decision timer SHALL start.

#### Scenario: Game start
- **WHEN** a matched game starts
- **THEN** all players see their hands and a 5 s countdown, and the dealer cannot discard until it ends

#### Scenario: Between hands
- **WHEN** the last connected human confirms the hand result
- **THEN** the next hand is dealt, a 3 s countdown runs, and then the dealer's clock starts

#### Scenario: Fast confirmer waits
- **WHEN** one player confirms the hand result immediately and another player (human or bot) takes 6 s
- **THEN** the next hand is dealt after 6 s, followed by the 3 s countdown

#### Scenario: Acting during the countdown
- **WHEN** a client sends an action while a countdown runs
- **THEN** the server rejects it and the game state is unchanged

#### Scenario: Bots wait too
- **WHEN** a bot is the dealer at the start of a hand with a human at the table
- **THEN** the bot's thinking delay starts only after the countdown ends

#### Scenario: Reconnect during a countdown
- **WHEN** a player reconnects while a countdown runs
- **THEN** they receive the remaining countdown with their view

#### Scenario: Bot-only games count down too
- **WHEN** a background game of bot players deals a hand
- **THEN** the same countdown runs (5 s at game start, 3 s after the bots have confirmed the previous result) before
  any bot acts

#### Scenario: No countdown when fast
- **WHEN** a room runs without delays (warm-up games, or fast-forwarded because every human left)
- **THEN** no countdown runs

### Requirement: Bots follow the timings
Bot players and takeover bots SHALL pace their decisions against the same per-decision budget a human in their seat
would have: the decision's base time (5 s turn, 5 s call, 10 s dealer's opening decision) plus the seat's time bank
(20 s, reset every hand). A bot SHALL never act during a countdown; its thinking delay SHALL start when the countdown
ends. Thinking time beyond the base SHALL come out of the bot's bank, and a bot SHALL never act within 1 s of the
deadline a human would have. On the dealer's opening decision a bot SHALL take longer on average than on a normal
turn, as a human studying a fresh hand would. When a bot player deliberately times out (the timeout percentage), it
SHALL use the full base time of that decision plus its bank.

#### Scenario: Bot dealer's opening
- **WHEN** a bot is dealer and the countdown of a new hand ends
- **THEN** it discards after a delay measured from the end of the countdown, within 10 s plus its bank minus 1 s

#### Scenario: Bot under the shorter base time
- **WHEN** a bot takes longer than 5 s on a normal turn
- **THEN** the excess is deducted from its bank and it still acts at least 1 s before a human's deadline would expire

#### Scenario: Bot timeout on the opening decision
- **WHEN** a bot player deliberately times out on the dealer's opening decision
- **THEN** its timeout action is played after 10 s plus its bank

#### Scenario: Takeover bot during a countdown
- **WHEN** a disconnected human's seat is played by a takeover bot and a hand is dealt
- **THEN** the takeover bot waits for the countdown like everyone else

### Requirement: Players join before the start countdown
A new game SHALL start with a joining phase: the 5 s start countdown SHALL begin only once every seat has joined, or
after at most 10 s. A human SHALL count as joined while connected (humans are connected when matched; a human who is
not connected is not waited for). Each bot player SHALL join after its own random, human-like connection delay, drawn
independently per bot and game, so the countdown does not always start at the human's arrival. During joining, players
see their hand, no one can act, no clock runs and no countdown is shown. Rooms that run without delays and recovered
games have no joining phase. Join delays SHALL depend only on randomness.

#### Scenario: Bots connect after the human
- **WHEN** a human is matched with three bot players whose connection delays are 0.9 s, 1.6 s and 2.4 s
- **THEN** the start countdown begins about 2.4 s after the match, and the dealer's clock after the countdown ends

#### Scenario: Join cap
- **WHEN** a seat has not joined 10 s after the match
- **THEN** the start countdown begins anyway

#### Scenario: Acting while joining
- **WHEN** a client sends an action before the start countdown has begun
- **THEN** the server rejects it and the game state is unchanged

### Requirement: Bots confirm hand results
Between hands, every bot player at the table SHALL confirm the hand result after its own random delay, drawn
independently per bot and per hand from a human-like distribution (most confirms within a few seconds, a few slow ones
up to the ready timeout). The next hand SHALL be dealt once every connected human and every bot player has confirmed,
or when the ready timeout (12 s) runs out. Bot confirm delays SHALL NOT depend on hidden state and SHALL scale with the
bots' think-time multiplier (0 = immediate). Bot-only games SHALL use the same rule instead of a fixed pause. Seats of
disconnected humans (played by takeover bots) are not waited for, as today.

#### Scenario: Human is not always last
- **WHEN** a human confirms a hand result 1 s after it is shown and a bot player at the table draws a 4 s confirm delay
- **THEN** the next hand is dealt about 4 s after the result, not at the human's confirm

#### Scenario: Waiting after confirming
- **WHEN** a human confirms the hand result and the others have not all confirmed yet
- **THEN** the result stays visible with the confirm button disabled and marked as waiting, until the next hand is dealt

#### Scenario: Slow human
- **WHEN** every bot player has confirmed and the human confirms after 7 s
- **THEN** the next hand is dealt at the human's confirm

#### Scenario: Different every hand
- **WHEN** many hands are played at a table with one human who always confirms at once
- **THEN** the deal time varies from hand to hand and is often later than the human's confirm

#### Scenario: Bot-only game
- **WHEN** a background game of bot players finishes a hand
- **THEN** the next hand is dealt when the last of its four bots has confirmed (at most the ready timeout), followed by
  the 3 s countdown

#### Scenario: Fast rooms
- **WHEN** a room runs without delays (warm-up or fast-forwarded)
- **THEN** bots confirm immediately

### Requirement: Countdowns are public
A countdown SHALL depend only on public events (a deal) and SHALL be sent identically to every seat; it SHALL NOT
reveal anything about hidden state.

#### Scenario: Same countdown for everyone
- **WHEN** a hand is dealt
- **THEN** every connected player receives the same countdown and no player's view contains legal actions until it ends

