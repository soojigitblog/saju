/**
 * Dev-only: persist in-memory mock store to disk so local testing survives
 * `next dev` restarts and hot reloads.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEV_STORE_DIR = path.join(process.cwd(), ".dev");
const DEV_STORE_FILE = path.join(DEV_STORE_DIR, "mock-store.json");

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function isMockPersistEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function loadMockStoreSnapshot(): Record<string, unknown> | null {
  if (!isMockPersistEnabled()) return null;
  if (!existsSync(DEV_STORE_FILE)) return null;
  try {
    const raw = readFileSync(DEV_STORE_FILE, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function writeMockStoreSnapshotSync(snapshot: Record<string, unknown>): void {
  if (!isMockPersistEnabled()) return;
  try {
    if (!existsSync(DEV_STORE_DIR)) {
      mkdirSync(DEV_STORE_DIR, { recursive: true });
    }
    writeFileSync(DEV_STORE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    /* best-effort dev convenience */
  }
}

export function scheduleMockStorePersist(snapshot: Record<string, unknown>): void {
  if (!isMockPersistEnabled()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeMockStoreSnapshotSync(snapshot);
  }, 200);
}

export function mapToEntries<K, V>(map: Map<K, V>): Array<[K, V]> {
  return [...map.entries()];
}

export function entriesToMap<K, V>(entries: Array<[K, V]> | undefined): Map<K, V> {
  return new Map(entries ?? []);
}

export function nestedMapToObject(
  map: Map<string, unknown[]>
): Record<string, unknown[]> {
  return Object.fromEntries(map.entries());
}

export function objectToNestedMap(
  obj: Record<string, unknown[]> | undefined
): Map<string, unknown[]> {
  return new Map(Object.entries(obj ?? {}));
}
