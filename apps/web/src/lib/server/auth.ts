import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins/username';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { isValidUsername, USERNAME_MAX, USERNAME_MIN } from '$lib/username';
import { db } from './db';

// Production: the public https URL (Secure cookies, strict origin check). Dev: derived from each request so the
// site works over plain HTTP on localhost and from a phone on the LAN; only local/private hosts are accepted.
const baseURL = env.BETTER_AUTH_URL || env.ORIGIN;
if (!baseURL && !dev && !building) throw new Error('Set BETTER_AUTH_URL or ORIGIN');
const devHosts = ['localhost:*', '127.0.0.1:*', '10.*', '192.168.*', '172.*'];

/**
 * The single auth instance. Other same-domain services (the future /ws game server) authenticate a request with
 * `auth.api.getSession({ headers })`.
 */
export const auth = betterAuth({
  appName: 'Riichi',
  database: { db, type: 'postgres' },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: baseURL || { allowedHosts: devHosts, protocol: 'http' },
  emailAndPassword: {
    enabled: true,
    // No email server yet: accounts work immediately, and there is no reset/verification flow.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    deleteUser: { enabled: true },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    customRules: {
      '/sign-in/*': { window: 60, max: 5 },
      '/sign-up/*': { window: 60, max: 5 },
      '/change-password': { window: 60, max: 5 },
      '/delete-user': { window: 60, max: 5 },
    },
  },
  advanced: {
    // Traefik (Dokploy) sits in front in production.
    ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
  },
  plugins: [
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: isValidUsername,
      displayUsernameValidator: isValidUsername,
    }),
    // Must stay last: lets cookies set during server-side auth calls reach the response.
    sveltekitCookies(getRequestEvent),
  ],
});

export type SessionUser = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
