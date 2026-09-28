// Every sound the game can make. A file name is served from /audio/ (static/audio); `null` means no sound yet and
// the cue stays silent. To add a sound: drop the file into static/audio, name it here, note its licence in the
// README there. `volume` (0..1, default 1) balances a file against the others.

export type SoundEntry = string | { file: string; volume?: number } | null;

export const SOUNDS = {
  // Tiles
  /** Any discard, every seat. */
  tilePlace: 'tile-place.mp3',
  /** Own draw. */
  tileDraw: null,
  /** Called tiles slide into the meld area. */
  meldPlace: null,
  /** The 1000-point stick is put down (riichi accepted). */
  riichiStick: null,
  /** A new dora indicator is turned over (after a kan). */
  doraFlip: null,

  // Calls: generic stingers instead of voice lines
  callChii: null,
  callPon: null,
  callKan: null,
  callRiichi: null,
  callRon: null,
  callTsumo: null,

  // Own seat
  /** Own turn starts after someone else acted. */
  yourTurn: null,
  /** A call window with options for you opened. */
  callAvailable: null,
  /** Tick in the last 5 s of your deadline (online). */
  timeWarning: null,

  // Hand and game
  /** Shuffle / wall build. */
  handStart: null,
  /** Win below mangan. */
  winHand: null,
  /** Win from mangan up to sanbaiman. */
  winLimit: null,
  winYakuman: null,
  /** Ryuukyoku. */
  drawExhaustive: null,
  drawAbortive: null,
  /** Final standings, you placed first. */
  gameEndFirst: null,
  /** Final standings, otherwise. */
  gameEnd: null,

  // Online
  /** Seated from the queue. */
  matchFound: null,
} satisfies Record<string, SoundEntry>;

export type SoundId = keyof typeof SOUNDS;
export type SoundManifest = Record<SoundId, SoundEntry>;

export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];
