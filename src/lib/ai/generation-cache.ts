/**
 * In-memory generation key cache scaffold (PHASE 4).
 * PHASE 5/6 should prefer DB ai_generations uniqueness.
 */
const completed = new Map<string, unknown>();

export function peekGenerationCache<T>(generationKey: string): T | undefined {
  return completed.get(generationKey) as T | undefined;
}

export function putGenerationCache(generationKey: string, value: unknown): void {
  completed.set(generationKey, value);
}

export function clearGenerationCacheForTests(): void {
  completed.clear();
}

export function hasGenerationKey(generationKey: string): boolean {
  return completed.has(generationKey);
}
