<script lang="ts">
  import { goto } from '$app/navigation';
  import { authClient } from '$lib/auth-client';
  import { authError } from '$lib/auth-errors';

  let { data } = $props();

  let open = $state<'' | 'password' | 'delete'>('');
  let current = $state('');
  let next = $state('');
  let confirmPw = $state('');
  let error = $state('');
  let ok = $state('');
  let busy = $state(false);

  function toggle(which: 'password' | 'delete') {
    open = open === which ? '' : which;
    error = ok = current = next = confirmPw = '';
  }

  async function run(fn: () => Promise<{ error: { code?: string; status?: number; message?: string } | null }>) {
    error = ok = '';
    busy = true;
    try {
      const res = await fn();
      if (res.error) error = authError(res.error);
      return !res.error;
    } finally {
      busy = false;
    }
  }

  async function changePassword(e: SubmitEvent) {
    e.preventDefault();
    const done = await run(() =>
      authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true }),
    );
    if (done) {
      current = next = '';
      ok = 'Password changed';
    }
  }

  async function signOut() {
    if (await run(() => authClient.signOut())) await goto('/', { invalidateAll: true });
  }

  async function deleteAccount(e: SubmitEvent) {
    e.preventDefault();
    if (await run(() => authClient.deleteUser({ password: confirmPw }))) await goto('/', { invalidateAll: true });
  }
</script>

<svelte:head><title>{data.user?.name} · Riichi</title></svelte:head>

<main class="page">
  <a class="back" href="/" aria-label="Home">←</a>

  <h1>{data.user?.name}</h1>
  <p class="email">{data.email}</p>

  <button class="btn" onclick={() => toggle('password')} aria-expanded={open === 'password'}>Change password</button>
  {#if open === 'password'}
    <form onsubmit={changePassword}>
      <input type="text" hidden autocomplete="username" value={data.user?.name} />
      <label class="field">
        Current password
        <input type="password" bind:value={current} autocomplete="current-password" required />
      </label>
      <label class="field">
        New password
        <input type="password" bind:value={next} autocomplete="new-password" minlength="8" maxlength="128" required />
      </label>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      {#if ok}<p class="form-ok" role="status">{ok}</p>{/if}
      <button class="btn primary" type="submit" disabled={busy}>Save</button>
    </form>
  {/if}

  <button class="btn ghost" onclick={signOut} disabled={busy}>Sign out</button>
  {#if error && open === ''}<p class="form-error" role="alert">{error}</p>{/if}

  <button class="btn ghost danger-text" onclick={() => toggle('delete')} aria-expanded={open === 'delete'}>
    Delete account
  </button>
  {#if open === 'delete'}
    <form onsubmit={deleteAccount}>
      <label class="field">
        Password
        <input type="password" bind:value={confirmPw} autocomplete="current-password" required />
      </label>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <button class="btn danger" type="submit" disabled={busy}>Delete permanently</button>
    </form>
  {/if}
</main>

<style>
  .back {
    align-self: flex-start;
    color: var(--ink-dim);
    text-decoration: none;
    font-size: 1.4rem;
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center start;
  }
  h1 {
    overflow-wrap: anywhere;
  }
  .email {
    margin: -8px 0 10px;
    color: var(--ink-dim);
    overflow-wrap: anywhere;
  }
  .danger-text {
    color: var(--danger);
    margin-top: 18px;
  }
</style>
