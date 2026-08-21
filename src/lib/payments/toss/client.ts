/**
 * Browser-side Toss helpers. Client key only — never import server.ts here.
 */

export function getTossClientKey(): string {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
  return key.trim();
}

export function isTossClientConfigured(): boolean {
  return getTossClientKey().length > 0;
}
