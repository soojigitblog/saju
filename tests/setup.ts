/**
 * Vitest setup — allow importing Next `server-only` modules in Node tests.
 */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
