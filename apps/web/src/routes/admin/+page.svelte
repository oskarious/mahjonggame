<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { AdminBot, AdminBotState } from '@mahjong/protocol';

  let { data, form } = $props();

  const pool = $derived(data.pool);
  const s = $derived(data.pool?.settings ?? null);
  const STATES: AdminBotState[] = ['idle', 'resting', 'queued', 'busy', 'retired'];

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

  const sec = (ms: number) => +(ms / 1000).toFixed(1);
  const ago = (t: number) => {
    const s = Math.round((Date.now() - t) / 1000);
    return s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
  };
  const msg = (name: string) => (form?.form === name ? form : null);
</script>

<svelte:head><title>Bots · Riichi</title></svelte:head>

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
          </tr>
        </thead>
        <tbody>
          {#each rows as b (b.id)}
            <tr class:sel={b.id === selectedId} class:retired={!b.active} onclick={() => (selectedId = b.id)}>
              <td>{b.name}</td>
              <td class="num">{b.rating}</td>
              <td class="num">{b.games}</td>
              <td class="num">{b.skill.toFixed(2)}</td>
              <td><span class="state {b.state}">{b.state}</span></td>
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
      {#snippet range(k: 'summonAfterMs' | 'botArrivalMs' | 'botRestMs', label: string, hint: string)}
        <fieldset class="field range">
          <legend>{label}</legend>
          <input name="{k}.lo" type="number" min="0" step="0.1" value={sec(s[k][0])} aria-label="{label} from" />
          <span>–</span>
          <input name="{k}.hi" type="number" min="0" step="0.1" value={sec(s[k][1])} aria-label="{label} to" />
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
              <small class="hint">Active bots to keep. Missing ones are created right away, spread over the bot rating range (about 960–1310). Default 120.</small>
            </label>
            <label class="field">
              Maximum pool <input name="botPoolMax" type="number" min="0" value={s.botPoolMax} />
              <small class="hint">Cap for bots created on demand. At the cap, a waiting player gets the nearest idle bot even if its rating is far off. Default 1000.</small>
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
              <small class="hint">If no idle bot is close enough in rating after this long, a new bot is created near the player's rating. Default 30.</small>
            </label>
            {@render range('botRestMs', 'Rest after a game (s)', "A bot isn't picked again right after a game, so the same opponents don't reappear instantly. Default 10–90.")}
          </div>
        </section>

        <section>
          <h3>Background games</h3>
          <p class="intro">
            Idle bots play each other so their ratings and game counts keep moving. These are normal games at human pace,
            just without people.{#if !pool?.backgroundAllowed} They are switched off on this server (<code>BOTS=off</code>).{/if}
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
              <small class="hint">A bot-only game only starts if at least this many idle bots are left over for players. Default 30.</small>
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
          <div class="grid">
            <label class="field">
              Think time × <input name="thinkScale" type="number" min="0" max="5" step="0.05" value={s.thinkScale} />
              <small class="hint">Multiplies how long bots take per move in live games: 1 = human-like, 0.5 = twice as fast, 0 = instant. Bots never run out their turn timer. Default 1.</small>
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
