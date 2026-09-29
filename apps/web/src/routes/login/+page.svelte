<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { authError } from '$lib/auth-errors';
  import Title from '$lib/components/Title.svelte';
  import { safeNext } from '$lib/safe-next';
  import { isValidUsername, USERNAME_MAX, USERNAME_MIN } from '$lib/username';

  let mode = $state<'in' | 'up'>('in');
  let login = $state('');
  let username = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    if (mode === 'up' && !isValidUsername(username)) {
      error = authError({ code: 'INVALID_USERNAME' });
      return;
    }
    busy = true;
    try {
      const res =
        mode === 'up'
          ? await authClient.signUp.email({ email, password, name: username, username, displayUsername: username })
          : login.includes('@')
            ? await authClient.signIn.email({ email: login, password })
            : await authClient.signIn.username({ username: login, password });
      if (res.error) {
        error = authError(res.error);
        return;
      }
      await goto(safeNext(page.url.searchParams.get('next')), { invalidateAll: true });
    } finally {
      busy = false;
    }
  }
</script>

<Title page={mode === 'in' ? 'Sign in' : 'Sign up'} />

<main class="page">
  <a class="back" href="/" aria-label="Home">←</a>

  <div class="seg">
    <label class:on={mode === 'in'}><input type="radio" bind:group={mode} value="in" />Sign in</label>
    <label class:on={mode === 'up'}><input type="radio" bind:group={mode} value="up" />Sign up</label>
  </div>

  <form onsubmit={submit}>
    {#if mode === 'in'}
      <label class="field">
        Username or email
        <input bind:value={login} autocomplete="username" autocapitalize="off" spellcheck="false" required />
      </label>
      <label class="field">
        Password
        <input type="password" bind:value={password} autocomplete="current-password" required />
      </label>
    {:else}
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
    {/if}

    {#if error}<p class="form-error" role="alert">{error}</p>{/if}

    <button class="btn primary big" type="submit" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
  </form>
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
</style>
