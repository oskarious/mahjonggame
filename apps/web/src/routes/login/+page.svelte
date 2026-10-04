<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { authError } from '$lib/auth-errors';
  import Title from '$lib/components/Title.svelte';
  import { safeNext } from '$lib/safe-next';

  let login = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  const next = $derived(page.url.searchParams.get('next'));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    busy = true;
    try {
      const res = login.includes('@')
        ? await authClient.signIn.email({ email: login, password })
        : await authClient.signIn.username({ username: login, password });
      if (res.error) {
        error = authError(res.error);
        return;
      }
      await goto(safeNext(next), { invalidateAll: true });
    } finally {
      busy = false;
    }
  }
</script>

<Title page="Sign in" />

<main class="page">
  <a class="back" href="/" aria-label="Home">←</a>

  <h1>Sign in</h1>

  <form onsubmit={submit}>
    <label class="field">
      Username or email
      <input bind:value={login} autocomplete="username" autocapitalize="off" spellcheck="false" required />
    </label>
    <label class="field">
      Password
      <input type="password" bind:value={password} autocomplete="current-password" required />
    </label>

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}

    <button class="btn primary big" type="submit" disabled={busy}>Sign in</button>
  </form>

  <p class="switch">
    New here? <a href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>Create an account</a>
  </p>
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
  .big {
    min-height: 56px;
    font-size: 1.1rem;
    margin-top: 4px;
  }
  .switch {
    text-align: center;
    color: var(--ink-dim);
  }
  .switch a {
    color: var(--ink);
    font-weight: 600;
  }
</style>
