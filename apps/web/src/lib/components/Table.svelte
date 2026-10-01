<script lang="ts">
  // The play screen: board, own panel and hand, result and final sheets, settings. Works for a game run in the
  // browser (LocalGame) or on the server (RemoteGame) through the GameSource shape.
  import { type Snippet, setContext } from 'svelte';
  import { type HintLevel, type Kind, type Tile as TileId, doraFromIndicator, kindOf } from '@mahjong/engine';
  import type { PlayerInfo, RatingChange } from '@mahjong/protocol';
  import { cuesFor, initialCueState } from '$lib/audio/cues';
  import { setSoundEnabled, setSoundVolume, sound } from '$lib/audio/player';
  import { TILE_MARKS, type TileMarks } from '$lib/marks';
  import type { GameSource } from '$lib/game/source';
  import { tileset } from '$lib/tileset.svelte';
  import Board from './Board.svelte';
  import Countdown from './Countdown.svelte';
  import FinalSheet from './FinalSheet.svelte';
  import PlayerArea from './PlayerArea.svelte';
  import ResultSheet from './ResultSheet.svelte';
  import SettingsSheet from './SettingsSheet.svelte';
  import TimerBar from './TimerBar.svelte';

  interface Props {
    game: GameSource;
    /** Offline only (see SettingsSheet). */
    hints?: HintLevel;
    onhints?: (level: HintLevel) => void;
    /** Online: seat info (ratings). */
    players?: PlayerInfo[] | null;
    /** Online: the table has a decision timer (shown on the own panel's tile slot). */
    timed?: boolean;
    /** Online: own decision countdown. */
    deadlineAt?: number | null;
    bank?: number | null;
    /** Online: when play starts after a deal (nobody can act until then). */
    countdownUntil?: number | null;
    /** Online: rating changes for the final sheet. */
    ratings?: RatingChange[] | null;
    /** Debug: every seat's concealed tiles. */
    revealed?: TileId[][] | null;
    onagain: () => void;
    onhome: () => void;
    /** Extra settings controls. */
    settings?: Snippet;
  }
  let {
    game,
    hints,
    onhints,
    players = null,
    timed = false,
    deadlineAt = null,
    bank = null,
    countdownUntil = null,
    ratings = null,
    revealed = null,
    onagain,
    onhome,
    settings,
  }: Props = $props();

  const QUICK_KEY = 'riichi:quickDiscard';
  const LABELS_KEY = 'riichi:tileLabels';

  let showSettings = $state(false);
  let showFinal = $state(false);
  let quickDiscard = $state(readFlag(QUICK_KEY, false));
  let tileLabels = $state(readFlag(LABELS_KEY, true));
  let soundOn = $state(sound().enabled);
  let volume = $state(Math.round(sound().volume * 100));

  function readFlag(key: string, fallback: boolean) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === '1';
    } catch {
      return fallback;
    }
  }
  function writeFlag(key: string, v: boolean) {
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }
  function setQuick(v: boolean) {
    quickDiscard = v;
    writeFlag(QUICK_KEY, v);
  }
  function setLabels(v: boolean) {
    tileLabels = v;
    writeFlag(LABELS_KEY, v);
  }

  function setSound(v: boolean) {
    soundOn = v;
    setSoundEnabled(v);
  }
  function setVolume(v: number) {
    volume = v;
    setSoundVolume(v);
  }

  // Sounds for live steps of whichever game is shown (a restart brings a new game object and fresh cue state).
  $effect(() => {
    let cueState = initialCueState();
    return game.listen((events, v) => {
      const out = cuesFor(events, v, cueState);
      cueState = out.state;
      for (const c of out.cues) sound().play(c.id, c.delay);
    });
  });

  // The tile ratio for layout CSS outside Tile (meld lines, the own panel's slot).
  $effect(() => {
    document.body.style.setProperty('--tile-ratio', String(tileset().ratio));
    return () => document.body.style.removeProperty('--tile-ratio');
  });

  $effect(() => {
    document.body.classList.toggle('no-tile-labels', !tileLabels);
    return () => document.body.classList.remove('no-tile-labels');
  });

  const view = $derived(game.view);

  // Board-wide tile markings: dora, and every copy of the tile the player is looking at.
  let focusKind: Kind | null = $state(null);
  const marks: TileMarks = $state({ dora: new Set(), focus: null });
  setContext(TILE_MARKS, marks);
  $effect(() => {
    marks.dora = new Set(view.doraIndicators.map((t) => doraFromIndicator(kindOf(t))));
    marks.focus = focusKind;
  });
  const red = $derived(game.red);

  export function reset() {
    showFinal = false;
    showSettings = false;
  }
</script>

<div class="screen">
  <div class="board-wrap">
    <Board {view} names={game.names} {red} {revealed} {players} />
    <Countdown until={countdownUntil} />
  </div>

  {#if game.error}<p class="error" role="alert">{game.error}</p>{/if}

  <PlayerArea
    {view}
    {red}
    {quickDiscard}
    bind:focusKind
    onact={(a) => game.act(a)}
    onsettings={() => (showSettings = true)}
    timer={timed ? ownTimer : undefined}
  />
</div>

{#snippet ownTimer()}<TimerBar {deadlineAt} bank={bank ?? 0} />{/snippet}

{#if view.result && (view.phase === 'handOver' || (view.phase === 'gameOver' && !showFinal))}
  <ResultSheet
    result={view.result}
    {view}
    names={game.names}
    {red}
    nextLabel={view.phase === 'gameOver' ? 'Final results' : 'Next hand'}
    waiting={view.phase === 'handOver' && (game.waitingNext ?? false)}
    onnext={() => (view.phase === 'gameOver' ? (showFinal = true) : game.next())}
  />
{/if}

{#if view.final && showFinal}
  <FinalSheet final={view.final} names={game.names} me={view.seat} {ratings} {onagain} {onhome} />
{/if}

{#if showSettings}
  <SettingsSheet
    {hints}
    {onhints}
    {quickDiscard}
    onquick={setQuick}
    {tileLabels}
    onlabels={setLabels}
    {soundOn}
    onsound={setSound}
    {volume}
    onvolume={setVolume}
    onclose={() => (showSettings = false)}
    {onhome}
  >
    {@render settings?.()}
  </SettingsSheet>
{/if}

<style>
  .screen {
    height: 100dvh;
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: calc(6px + env(safe-area-inset-top));
  }
  .board-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .error {
    margin: 0 8px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--danger);
    color: #1f0c05;
    font-size: 0.85rem;
  }
</style>
