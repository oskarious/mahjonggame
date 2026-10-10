<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { authError } from '$lib/auth-errors';
  import Seo from '$lib/components/Seo.svelte';
  import { safeNext } from '$lib/safe-next';
  import { isValidUsername, USERNAME_MAX, USERNAME_MIN } from '$lib/username';

  let username = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  const next = $derived(page.url.searchParams.get('next'));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    if (!isValidUsername(username)) {
      error = authError({ code: 'INVALID_USERNAME' });
      return;
    }
    busy = true;
    try {
      const res = await authClient.signUp.email({ email, password, name: username, username, displayUsername: username });
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

<Seo
  title="Sign up"
  description="Create a free Riichi Arena account and play rated riichi mahjong online."
  path="/signup"
  type="website"
/>

<main class="page">
  <a class="back" href="/" aria-label="Home">←</a>

  <h1>Create an account</h1>

  <form onsubmit={submit}>
    <label class="field">
      Username
      <input
        bind:value={username}
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        minlength={USERNAME_MIN}
        maxlength={USERNAME_MAX}
        pattern="[A-Za-z0-9_]+"
        required
      />
    </label>
    <label class="field">
      Email
      <input type="email" bind:value={email} autocomplete="email" required />
    </label>
    <label class="field">
      Password
      <input type="password" bind:value={password} autocomplete="new-password" minlength="8" maxlength="128" required />
    </label>

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}

    <button class="btn primary big" type="submit" disabled={busy}>Create account</button>
  </form>

  <p class="switch">
    Have an account? <a href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>Sign in</a>
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
