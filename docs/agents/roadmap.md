# Where this is going (keep designs compatible)

Read when designing a feature that touches game records, replays, leaderboards, profiles, scaling, or social
features.

- Game records are stored (`game`, `game_seat`, `game_action`) but there is no replay/history UI, leaderboard or
  profile yet. Bot players are designed to appear in those like humans; whether leaderboards include them is open
  (the `bot` table allows either). Also open: a neutral "opponents may include AI players" line on an about page.
  Bot-only games store full action logs (~10k rows/hour at ~12 tables); prune old ones if it ever matters.
- Open question: replays should not reveal the other players' hands to the player themself. Never serve the log of
  a running game (fair-play.md).
- One game server instance holds all live games (in-memory rooms and queue); horizontal scaling would need sticky
  routing or a shared queue. Private rooms, invites, spectating and chat are out of scope so far.
- Timer defaults (5 s turn / 10 s opening / 5 s call / 20 s bank, 5 s / 3 s countdowns) and the bot anchor
  (skill 0.15 = 1000) are guesses until humans have played; both are config/constants, and re-anchoring the bots is a
  constant shift for everyone.
