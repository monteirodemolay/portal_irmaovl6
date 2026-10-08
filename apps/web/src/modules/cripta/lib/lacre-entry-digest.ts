/** Isomorphic digest over a .lacre's entry metadata (kind/id/uid/sha256) — deliberately NOT
 * seal-manifest.ts's digestInventory, which hashes SealEntry (adds `fileId`, a Wix reference
 * that stops meaning anything once a Renovação re-seals letters entirely offline, never
 * touching Wix). Uses Web Crypto (`crypto.subtle`), available both in the browser (the offline
 * tool, bundled by esbuild for `platform: 'browser'`) and in the Next.js Node runtime (global
 * since Node 19) — never `node:crypto`, which the offline bundle cannot include. */

export type LacreEntryMeta = { kind: 'letter' | 'draft'; id: string; uid: string; sha256: string };

export async function digestLacreEntries(entries: LacreEntryMeta[]): Promise<string> {
  const ordered = [...entries]
    .map((entry) => ({ kind: entry.kind, id: entry.id, uid: entry.uid, sha256: entry.sha256 }))
    .sort((a, b) => {
      const left = `${a.kind}:${a.uid}:${a.id}`;
      const right = `${b.kind}:${b.uid}:${b.id}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
  const bytes = new TextEncoder().encode(JSON.stringify({ format: 'vl6-lacre-inventory-v1', entries: ordered }));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
