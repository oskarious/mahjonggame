import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // The game server is a separate process; /ws is proxied so development is same-origin like production.
  // GAME_SERVER_URL (apps/web/.env) is the same variable the server uses for the health check.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const gameServer = (env.GAME_SERVER_URL || 'http://localhost:3001').replace(/^http/, 'ws');
  return {
    plugins: [sveltekit()],
    server: {
      // Reachable from a phone on the same network for testing.
      host: true,
      proxy: {
        '/ws': { target: gameServer, ws: true },
      },
    },
  };
});
