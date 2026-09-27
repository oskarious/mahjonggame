// Liveness check for the container and the reverse proxy.
export function GET(): Response {
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
