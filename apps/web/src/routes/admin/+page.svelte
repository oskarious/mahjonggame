<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { AdminBot, AdminBotState } from '@mahjong/protocol';
  import RankBadge from '$lib/components/RankBadge.svelte';
  import Title from '$lib/components/Title.svelte';

  let { data, form } = $props();

  const pool = $derived(data.pool);
  const s = $derived(data.pool?.settings ?? null);
  const STATES: AdminBotState[] = ['idle', 'offline', 'resting', 'queued', 'busy', 'retired'];

  let query = $state('');
  let stateFilter = $state<AdminBotState | ''>('');
  type SortKey = 'name' | 'rating' | 'games' | 'skill' | 'state';
  let sortKey = $state<SortKey>('rating');
  let sortDesc = $state(true);
  let selectedId = $state<string | null>(null);
  let refreshing = $state(false);

  const rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const list = (pool?.bots ?? []).filter(
      (b) => (!q || b.name.toLowerCase().includes(q)) && (!stateFilter || b.state === stateFilter),
    );
    const dir = sortDesc ? -1 : 1;
    return list.sort((a, b) => {
      const x = a[sortKey];
      const y = b[sortKey];
      return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir;
    });
  });
  const selected = $derived<AdminBot | null>(pool?.bots.find((b) => b.id === selectedId) ?? null);

  function sortBy(k: SortKey) {
    if (sortKey === k) sortDesc = !sortDesc;
    else {
      sortKey = k;
      sortDesc = k !== 'name' && k !== 'state';
    }
  }

  async function refresh() {
    refreshing = true;
    await invalidateAll();
    refreshing = false;
  }

  const sec = (ms: number) => +(ms / 1000).toFixed(3);
  const ago = (t: number) => {
    const s = Math.round((Date.now() - t) / 1000);
    return s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
  };
  const msg = (name: string) => (form?.form === name ? form : null);

  /** `Asia/Tokyo` → `Tokyo`. */
  const city = (tz: string) => tz.slice(tz.lastIndexOf('/') + 1).replaceAll('_', ' ');
  const clocks = new Map<string, Intl.DateTimeFormat>();
  /** The bot's local time now (as of the last load), e.g. `21:04`. */
  const localTime = (tz: string) => {
    let f = clocks.get(tz);
    if (!f) clocks.set(tz, (f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })));
    return f.format(data.loadedAt);
  };
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const win = ([a, b]: [number, number]) => `${hhmm(a)}–${hhmm(b)}`;
</script>

<Title page="Bots" />

<main class="admin">
  <header>
    <a class="back" href="/" aria-label="Home">←</a>
    <h1>Bots</h1>
    <button class="btn ghost small" onclick={refresh} disabled={refreshing}>Refresh</button>
  </header>

  {#if !pool || !s}
    <p class="form-error" role="alert">{data.error}</p>
  {:else}
    <section class="summary">
      <span class="chip">{pool.counts.active} active</span>
      {#if pool.settings.schedulesEnabled}
        <span class="chip">{pool.counts.online} online</span>
        <span class="chip">{pool.counts.offline} offline</span>
      {/if}
      <span class="chip">{pool.counts.idle} idle</span>
      <span class="chip">{pool.counts.resting} resting</span>
      <span class="chip">{pool.counts.queued} queued</span>
      <span class="chip">{pool.counts.busy} busy</span>
      {#if pool.counts.retired}<span class="chip">{pool.counts.retired} retired</span>{/if}
      <span class="sep"></span>
      <span class="chip">{pool.live.rooms} games</span>
      <span class="chip">{pool.live.humanRooms} with players</span>
      <span class="chip">{pool.live.humansQueued} queued players</span>
      {#if pool.warmingUp}<span class="chip gold">warm-up</span>{/if}
      {#if !pool.backgroundAllowed}<span class="chip bad">BOTS=off</span>{:else if !pool.settings.backgroundEnabled}<span class="chip bad">background off</span>{/if}
      {#if pool.lastGrownAt}<span class="chip bad" title="No idle bot fitted a waiting player">grew {ago(pool.lastGrownAt)}</span>{/if}
    </section>

    <section class="table-tools">
      <input type="search" placeholder="Name" bind:value={query} aria-label="Filter by name" />
      <select bind:value={stateFilter} aria-label="Filter by state">
        <option value="">All states</option>
        {#each STATES as s (s)}<option value={s}>{s}</option>{/each}
      </select>
      <span class="count">{rows.length}</span>
    </section>

    {#if selected}
      <form class="edit" method="POST" action="?/update" use:enhance>
        <input type="hidden" name="id" value={selected.id} />
        <label class="field">Name <input name="name" value={selected.name} maxlength="20" /></label>
        <label class="field">Skill <input name="skill" type="number" min="0" max="1" step="0.01" value={selected.skill.toFixed(2)} /></label>
        <p class="schedule">
          {selected.schedule.tz} · {localTime(selected.schedule.tz)} now · weekdays {win(selected.schedule.weekday)} · weekends
          {win(selected.schedule.weekend)} · about {selected.schedule.appetiteMin} min a day
        </p>
        <div class="edit-buttons">
          <button class="btn primary small" type="submit">Save</button>
          <button class="btn ghost small" type="submit" name="active" value={selected.active ? 'false' : 'true'}>
            {selected.active ? 'Retire' : 'Reactivate'}
          </button>
          <button class="btn ghost small" type="button" onclick={() => (selectedId = null)}>Close</button>
        </div>
        {#if msg('update')?.error}<p class="form-error" role="alert">{msg('update')?.error}</p>{/if}
        {#if msg('update')?.ok}<p class="form-ok" role="status">{msg('update')?.ok}</p>{/if}
      </form>
    {/if}

    <div class="scroll">
      <table>
        <thead>
          <tr>
            {#each [['name', 'Name'], ['rating', 'Rating'], ['games', 'Games'], ['skill', 'Skill'], ['state', 'State']] as [k, label] (k)}
              <th class:num={k !== 'name' && k !== 'state'} aria-sort={sortKey === k ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
                <button onclick={() => sortBy(k as SortKey)}>
                  {label}{sortKey === k ? (sortDesc ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            {/each}
            <th>Local</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as b (b.id)}
            <tr class:sel={b.id === selectedId} class:retired={!b.active} onclick={() => (selectedId = b.id)}>
              <td>{b.name}</td>
              <td class="num"><RankBadge rating={b.rating} /></td>
              <td class="num">{b.games}</td>
              <td class="num">{b.skill.toFixed(2)}</td>
              <td><span class="state {b.state}">{b.state}</span></td>
              <td class="local" title="{b.schedule.tz} · weekdays {win(b.schedule.weekday)} · weekends {win(b.schedule.weekend)}">
                {city(b.schedule.tz)} {localTime(b.schedule.tz)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <details open={msg('create') !== null}>
      <summary>Add bots</summary>
      <form class="grid" method="POST" action="?/create" use:enhance>
        <label class="field">Count <input name="count" type="number" min="1" max="500" value="10" /></label>
        <label class="field">From rating <input name="minRating" type="number" value="950" /></label>
        <label class="field">To rating <input name="maxRating" type="number" value="1310" /></label>
        <button class="btn primary" type="submit">Add</button>
      </form>
      <form class="grid" method="POST" action="?/create" use:enhance>
        <label class="field">Name <input name="name" maxlength="20" placeholder="random" /></label>
        <label class="field">Skill <input name="skill" type="number" min="0" max="1" step="0.01" placeholder="random" /></label>
        <button class="btn" type="submit">Add one</button>
      </form>
      {#if msg('create')?.error}<p class="form-error" role="alert">{msg('create')?.error}</p>{/if}
      {#if msg('create')?.ok}<p class="form-ok" role="status">{msg('create')?.ok}</p>{/if}
    </details>

    <details open={msg('settings') !== null}>
      <summary>Settings</summary>
      {#snippet range(k: 'summonAfterMs' | 'botArrivalMs' | 'botRestMs' | 'thinkForcedMs' | 'thinkCallMs', label: string, hint: string)}
        <fieldset class="field range">
          <legend>{label}</legend>
          <input name="{k}.lo" type="number" min="0" step="0.01" value={sec(s[k][0])} aria-label="{label} from" />
          <span>–</span>
          <input name="{k}.hi" type="number" min="0" step="0.01" value={sec(s[k][1])} aria-label="{label} to" />
          <small class="hint">{hint}</small>
        </fieldset>
      {/snippet}
      {#snippet minutes(k: 'appetiteMin' | 'sessionMin', label: string, hint: string)}
        <fieldset class="field range">
          <legend>{label}</legend>
          <input name="{k}.lo" type="number" min="0" step="1" value={s[k][0]} aria-label="{label} from" />
          <span>–</span>
          <input name="{k}.hi" type="number" min="0" step="1" value={s[k][1]} aria-label="{label} to" />
          <small class="hint">{hint}</small>
        </fieldset>
      {/snippet}
      <form class="settings" method="POST" action="?/settings" use:enhance={() => ({ update }) => update({ reset: false })}>
        <section>
          <h3>Pool</h3>
          <p class="intro">Bot players are accounts that look like real players. Retired bots don't count.</p>
          <div class="grid">
            <label class="field">
              Minimum pool <input name="botPoolMin" type="number" min="0" value={s.botPoolMin} />
              <small class="hint">Active bots to keep. Raising it creates the missing ones right away, spread over the bot rating range (about 960–1310); lowering it removes none (retire bots for that). With active hours on, only some are online at a time. Default 400.</small>
            </label>
            <label class="field">
              Maximum pool <input name="botPoolMax" type="number" min="0" value={s.botPoolMax} />
              <small class="hint">Most active bots. Bots created for waiting players, added here or reactivated stop at this number; then a waiting player gets the nearest idle bot even if its rating is far off. Default 1000.</small>
            </label>
          </div>
        </section>

        <section>
          <h3>Waiting players</h3>
          <p class="intro">
            When someone queues and no other players are around, bots join the queue one at a time, so the table fills at
            a natural pace that varies from game to game. Times are picked at random between the two values.
          </p>
          <div class="grid">
            {@render range('summonAfterMs', 'First bot after (s)', 'How long a player waits before the first bot joins. Gives other players time to be matched with them first. Default 3–9.')}
            {@render range('botArrivalMs', 'Between bots (s)', 'Gap before the next bot joins the same player. A solo wait is about the first delay plus three gaps. Default 2–8.')}
            <label class="field">
              Grow after (s) <input name="growAfterMs" type="number" min="0" step="0.1" value={sec(s.growAfterMs)} />
              <small class="hint">If no idle bot is close enough in rating after this long, a new bot is created near the player's rating. An offline bot that is close enough logs on first. Default 30.</small>
            </label>
            {@render range('botRestMs', 'Rest after a game (s)', "A bot isn't picked again right after a game, so the same opponents don't reappear instantly. Default 10–90.")}
          </div>
        </section>

        <section>
          <h3>Background games</h3>
          <p class="intro">
            Idle online bots play each other so their ratings and game counts keep moving. These are normal games at human
            pace, just without people.{#if !pool?.backgroundAllowed} They are switched off on this server (<code>BOTS=off</code>).{/if}
          </p>
          <div class="grid">
            <label class="field check">
              <span><input name="backgroundEnabled" type="checkbox" checked={s.backgroundEnabled} /> Background games</span>
              <small class="hint">Off: no new bot-only games start; running ones finish. Bots still join for waiting players.</small>
            </label>
            <label class="field">
              Start one every (s) <input name="backgroundEveryMs" type="number" min="1" step="0.1" value={sec(s.backgroundEveryMs)} />
              <small class="hint">Average time between new bot-only games (each gap is 50–150 % of this). Default 45.</small>
            </label>
            <label class="field">
              Idle reserve <input name="idleReserve" type="number" min="0" value={s.idleReserve} />
              <small class="hint">A bot-only game only starts if at least this many idle online bots are left over for players. Default 30.</small>
            </label>
          </div>
        </section>

        <section>
          <h3>Active hours</h3>
          <p class="intro">
            Each bot lives in a time zone and has free time on weekdays and (longer) on weekends. It plays only in online
            sessions, most likely mid-window, sometimes a little before or after, almost never at night. Changing the
            regions or play per day only affects new bots.
          </p>
          <div class="grid">
            <label class="field check">
              <span><input name="schedulesEnabled" type="checkbox" checked={s.schedulesEnabled} /> Active hours</span>
              <small class="hint">Off: every bot is online all the time.</small>
            </label>
            {@render minutes('appetiteMin', 'Play per day (min)', 'Average time a new bot spends online per day; most get the low end. Default 90–240.')}
            {@render minutes('sessionMin', 'Session (min)', 'Length of one online session, usually a few games. Most are short. Default 20–150.')}
            <label class="field">
              Regions
              <textarea name="regions" rows={Math.min(s.regions.length, 8)}>{s.regions.map((r) => `${r.tz} ${r.weight}`).join('\n')}</textarea>
              <small class="hint">One time zone and weight per line. New bots get a zone in proportion to its weight. Default mostly Asia/Tokyo.</small>
            </label>
          </div>
        </section>

        <section>
          <h3>Warm-up</h3>
          <p class="intro">
            While fewer than half the bots have 20 rated games (for example after creating many), bot-only games run
            without delays to build up history quickly. The idle reserve doesn't apply then.
          </p>
          <div class="grid">
            <label class="field">
              Start one every (s) <input name="warmupEveryMs" type="number" min="0.1" step="0.1" value={sec(s.warmupEveryMs)} />
              <small class="hint">Time between new warm-up games. Default 2.</small>
            </label>
            <label class="field">
              Tables at once <input name="warmupTables" type="number" min="0" value={s.warmupTables} />
              <small class="hint">Most warm-up games running at the same time. Each uses 4 bots and some server CPU. Default 8.</small>
            </label>
          </div>
        </section>

        <section>
          <h3>Bot pace</h3>
          <p class="intro">
            How long bots take per move in live games, so they can't be told apart from players by their timing. Single
            values are typical times: real ones vary, most between about half and double. Bots never act within 1 s of
            the deadline. Warm-up games and games nobody is watching run without delays.
          </p>
          <div class="grid">
            <label class="field">
              Think time × <input name="thinkScale" type="number" min="0" max="5" step="0.05" value={s.thinkScale} />
              <small class="hint">Multiplies every delay below: 1 = as set, 0.5 = twice as fast, 0 = instant. Default 1.</small>
            </label>
            {@render range('thinkForcedMs', 'Only one move (s)', 'Draws with nothing to decide and other forced moves. Default 0.3–0.8.')}
            {@render range('thinkCallMs', 'Call or pass (s)', 'Deciding on a pon, chii, kan or ron after a discard. Default 0.8–2.5.')}
            <label class="field">
              Own turn (s) <input name="thinkTurnMs" type="number" min="0" step="0.01" value={sec(s.thinkTurnMs)} />
              <small class="hint">Typical time to pick a discard. Default 0.9.</small>
            </label>
            <label class="field">
              + per tile choice (s) <input name="thinkPerTileMs" type="number" min="0" step="0.01" value={sec(s.thinkPerTileMs)} />
              <small class="hint">Added to the own-turn time for every different tile it could discard (usually 6–13). Default 0.06.</small>
            </label>
            <label class="field">
              Big decision × <input name="thinkSpecialScale" type="number" min="0" max="5" step="0.05" value={s.thinkSpecialScale} />
              <small class="hint">Own-turn time when riichi, kan, tsumo or an abortive draw is possible. Default 1.6.</small>
            </label>
            <label class="field">
              First move × <input name="thinkOpeningScale" type="number" min="0" max="5" step="0.05" value={s.thinkOpeningScale} />
              <small class="hint">The dealer's first decision of a hand, looking over the fresh hand. Default 1.8.</small>
            </label>
            <label class="field">
              Long think (%) <input name="longThinkPercent" type="number" min="0" max="100" step="0.5" value={s.longThinkPercent} />
              <small class="hint">Chance per own turn with a choice to take 60–100 % of the base time plus up to 60 % of the time bank. Default 5.</small>
            </label>
            <label class="field">
              Timeout chance (%) <input name="timeoutPercent" type="number" min="0" max="10" step="0.1" value={s.timeoutPercent} />
              <small class="hint">Chance per decision that a bot lets its timer run out, like a distracted player: it waits the full time plus its time bank, then the automatic move is played and its bank is empty for the rest of the hand. Only in games with players. Three bots make about 180 decisions a game, so 0.5 means roughly one timeout per game. Default 0.5.</small>
            </label>
          </div>
        </section>

        <section>
          <h3>Joining and results</h3>
          <p class="intro">
            A new game's countdown starts once every bot has joined, and the next hand is dealt once every bot has
            confirmed the result, so neither always follows the player's own click. Also scaled by think time ×.
          </p>
          <div class="grid">
            <label class="field">
              Join a game (s) <input name="joinMedianMs" type="number" min="0" step="0.1" value={sec(s.joinMedianMs)} />
              <small class="hint">Typical time for a bot to join a new game. Never more than the server's join wait (JOIN_MAX_MS, 10 s). Default 1.5.</small>
            </label>
            <label class="field">
              Join at least (s) <input name="joinMinMs" type="number" min="0" step="0.1" value={sec(s.joinMinMs)} />
              <small class="hint">No bot joins faster. Default 0.4.</small>
            </label>
            <label class="field">
              Confirm result (s) <input name="readyMedianMs" type="number" min="0" step="0.1" value={sec(s.readyMedianMs)} />
              <small class="hint">Typical time for a bot to confirm a hand result. Never more than the server's ready wait (READY_MS, 12 s). Default 2.5.</small>
            </label>
            <label class="field">
              Confirm at least (s) <input name="readyMinMs" type="number" min="0" step="0.1" value={sec(s.readyMinMs)} />
              <small class="hint">No bot confirms faster. Default 0.8.</small>
            </label>
            <label class="field">
              Slow confirm (%) <input name="readySlowPercent" type="number" min="0" max="100" step="0.5" value={s.readySlowPercent} />
              <small class="hint">Chance a bot looks at the result for a while instead. Default 8.</small>
            </label>
            <label class="field">
              Slow confirm from (s) <input name="readySlowFromMs" type="number" min="0" step="0.1" value={sec(s.readySlowFromMs)} />
              <small class="hint">A slow confirm takes between this and the ready wait. Default 6.</small>
            </label>
          </div>
        </section>

        <button class="btn primary save" type="submit">Save</button>
      </form>
      {#if msg('settings')?.error}<p class="form-error" role="alert">{msg('settings')?.error}</p>{/if}
      {#if msg('settings')?.ok}<p class="form-ok" role="status">{msg('settings')?.ok}</p>{/if}
    </details>
  {/if}
</main>

<style>
  .admin {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--ink);
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h1 {
    margin: 0;
    font-size: 1.4rem;
    flex: 1;
  }
  .back {
    color: var(--ink-dim);
    text-decoration: none;
    font-size: 1.4rem;
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center start;
  }
  .btn.small {
    min-height: 38px;
    font-size: 0.9rem;
    padding: 0 12px;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .sep {
    width: 8px;
  }
  .table-tools {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .table-tools input {
    flex: 1;
    min-width: 0;
  }
  .count {
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
    min-width: 3ch;
    text-align: right;
  }
  .scroll {
    max-height: 60vh;
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--panel);
    text-align: left;
    font-weight: 600;
    color: var(--ink-dim);
  }
  th button {
    width: 100%;
    padding: 8px 10px;
    text-align: inherit;
    font-weight: inherit;
  }
  td {
    padding: 7px 10px;
    border-top: 1px solid var(--line);
    white-space: nowrap;
  }
  .num {
    text-align: right;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover {
    background: var(--surface);
  }
  tr.sel {
    background: var(--surface-me);
  }
  tr.retired td {
    color: var(--ink-dim);
  }
  .state {
    font-size: 0.8rem;
    color: var(--ink-dim);
  }
  .state.busy {
    color: var(--accent);
  }
  .state.queued {
    color: var(--ok);
  }
  .state.retired {
    color: var(--danger);
  }
  .state.offline {
    opacity: 0.6;
  }
  .local {
    color: var(--ink-dim);
  }
  .schedule {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  /* Like the global input style (app.css). */
  .field textarea {
    font: inherit;
    font-size: 0.9rem;
    text-transform: none;
    letter-spacing: normal;
    color: var(--ink);
    background: var(--panel-2);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 8px 10px;
    resize: vertical;
  }
  .edit {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 10px;
    padding: 12px;
    border-radius: var(--radius);
    background: var(--panel);
  }
  .edit-buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .edit .form-error,
  .edit .form-ok {
    grid-column: 1 / -1;
  }
  details {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 10px 14px;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
    min-height: 32px;
    display: flex;
    align-items: center;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
    align-items: end;
    margin: 10px 0;
  }
  .field input {
    min-height: 40px;
  }
  .field.check > span {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
  }
  .field.check input {
    min-height: auto;
  }
  .settings section {
    padding: 12px 0 4px;
    border-top: 1px solid var(--line);
  }
  .settings section:first-child {
    border-top: none;
  }
  .settings h3 {
    margin: 0 0 4px;
    font-size: 1rem;
  }
  .intro {
    margin: 0;
    color: var(--ink-dim);
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .settings .grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    align-items: start;
  }
  .hint {
    text-transform: none;
    letter-spacing: normal;
    font-size: 0.78rem;
    line-height: 1.35;
    color: var(--ink-dim);
    opacity: 0.85;
  }
  fieldset.range .hint {
    grid-column: 1 / -1;
    margin-top: 2px;
  }
  .save {
    margin: 8px 0 4px;
  }
  fieldset.range {
    border: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 4px;
  }
  fieldset.range legend {
    padding: 0 0 6px;
  }
  fieldset.range input {
    min-width: 0;
  }
</style>
