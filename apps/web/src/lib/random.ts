/**
 * Random hex id. Uses getRandomValues rather than crypto.randomUUID, which only exists in secure
 * contexts (HTTPS or localhost), so it also works when testing on a phone over the LAN.
 */
export function randomId(bytes = 16): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}
