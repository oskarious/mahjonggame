import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';

// Same origin as the site, so no baseURL.
export const authClient = createAuthClient({ plugins: [usernameClient()] });
