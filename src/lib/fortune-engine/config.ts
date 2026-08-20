import { DEFAULT_ENGINE_CONFIG } from "./constants";
import type { FortuneEngineConfig } from "./types";

export function resolveEngineConfig(
  overrides?: Partial<FortuneEngineConfig>
): FortuneEngineConfig {
  return {
    ...DEFAULT_ENGINE_CONFIG,
    ...overrides,
  };
}
