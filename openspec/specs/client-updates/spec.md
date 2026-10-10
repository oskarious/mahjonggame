# client-updates Specification

## Purpose
How open pages move to a new deploy: reload on a protocol mismatch, on a reconnect when a new web build is live, and
on the next navigation after polling, without reload loops.
## Requirements
### Requirement: Reload on protocol mismatch
When the game server rejects the client's protocol version, the client SHALL reload the page instead of reconnecting.
It SHALL reload at most once per 60 seconds; if a reload has already happened within that window (or the tab has no
storage to tell), it SHALL stop reconnecting and offer a Reload button.

#### Scenario: Breaking deploy
- **WHEN** an open page connects and the game server answers `badVersion`
- **THEN** the page reloads and connects with the new client code

#### Scenario: Mismatched rollout
- **WHEN** the reloaded page is rejected with `badVersion` again within 60 seconds
- **THEN** it does not reload again, stops reconnecting and shows a Reload button

### Requirement: Reload on reconnect when a new build is live
When the websocket reconnects after a drop (not on the page's first connection), the client SHALL check whether a newer
web build is deployed and, if so, reload the page. A reconnect without a newer build SHALL NOT reload. A reload during
an online game SHALL return the player to their seat (see online-play, Disconnection and reconnection).

#### Scenario: Deploy mid-game
- **WHEN** a player's socket drops for a deploy and reconnects, and a new web build is live
- **THEN** the page reloads and the player is back at their seat with the current view

#### Scenario: Network blip
- **WHEN** the socket drops and reconnects with no new web build deployed
- **THEN** the page does not reload

### Requirement: Open pages notice new builds
The web app SHALL poll for a new build at most every 5 minutes while a page is open, so the next navigation after a
deploy loads the new build in full.

#### Scenario: Idle tab
- **WHEN** a page has been open across a deploy and the player navigates
- **THEN** the navigation loads the new build

