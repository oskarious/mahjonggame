// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session, SessionUser } from '$lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: Session | null;
    }
  }
}

export {};
