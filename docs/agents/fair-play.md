# Fair play (online games must stay cheat-proof)

Read when touching views, hints, events, bot heuristics, pacing/timers, protocol messages, the wall RNG, or
anything a client receives.

A client is assumed to be modified: it reads every byte and every timing it gets, and sends anything. Rules:

- **Hidden information** is defined in one place, `scrambleHidden(g, seat)` (engine `src/hidden.ts`): other seats'
  concealed tiles, the wall and dead wall, unrevealed dora / ura, other seats' furiten flags and call options /
  responses, the wall RNG. **Everything a seat is shown or does must be identical on the scrambled state:** views at
  every hint level, hints, bot decisions, `timeoutAction`, bot think times. `test/fairness.test.ts` (engine) and
  "Room hidden information" (game server) check this on simulated games. When you add a view field, a hint, a bot
  heuristic or a pacing rule, these tests are what catch a peek at hidden state; if you add a new kind of hidden
  state, add it to `scrambleHidden` first. Don't weaken them to make a change pass.
- **Bots play fair.** Bot players and takeover bots get the full `GameState` but may only use what their seat can
  see (enforced by the tests above). A bot that reads the wall or other hands would cheat against humans.
- **Nothing is sent unless something public changed.** Clients get `GameState.publicSeq` (as `view.seq` /
  `update.seq`), never the raw `seq`: a call response that leaves the window open emits no events, doesn't advance
  it, and the room sends no update to anyone but the responder (an update alone would say "someone else could call
  and answered"). `act` is validated against `publicSeq`. Keep new messages to that standard: no per-seat info about
  others, no messages whose mere existence or timing depends on hidden state.
- **Hint levels are enforced server-side** (`clampHints`, only ever lowered by the client). `view.tenpai` is
  deliberately ungated (own hand + public tiles only). The engine is open, so hints are a convenience, not a secret.
- **Wall RNG is cryptographic** (ChaCha20 keyed with SHA-256 of the secret `randomUUID` seed, `src/rng.ts`): revealed
  tiles don't let anyone reconstruct the generator and predict later walls. Never send the seed or the RNG state to a
  client, and don't serve `game_action` / the seed of a running game (future replay UI: finished games only).
  Changing wall generation breaks replay of stored games: running ones are marked `aborted` on recovery (unrated);
  bump `SAVE_VERSION` for offline saves.
- **Debug features** (show bots' hands, autoplay) exist only in offline play; online games never expose them.
- **Accepted, documented tells** (like Tenhou / Mahjong Soul): a discard nobody can call is followed by the next draw
  at once; if someone can, the window stays open until they answer, so the table sees that *someone* could call
  (not who, and not what). Think times of humans (and bots, by design) are visible. Hiding these would need a pause
  after every discard; decided against for pace.
- **Not preventable by code:** collusion between accounts at one table and outside AI assistance. Possible later:
  keep same-IP accounts apart in matchmaking, statistics on agreement with the bot's best move.
