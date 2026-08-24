export type AiErrorCode =
  | "OPENAI_API_KEY_MISSING"
  | "OPENAI_TIMEOUT"
  | "OPENAI_RATE_LIMIT"
  | "OPENAI_SERVER_ERROR"
  | "OPENAI_BAD_REQUEST"
  | "OPENAI_INVALID_MODEL"
  | "STRUCTURED_PARSE_FAILED"
  | "SCHEMA_VALIDATION_FAILED"
  | "SEMANTIC_VALIDATION_FAILED"
  | "RETRY_EXHAUSTED"
  | "CONFIGURATION_ERROR"
  | "PAID_AI_NOT_CONFIGURED"
  | "UNKNOWN";

export class AiEngineError extends Error {
  readonly code: AiErrorCode;
  readonly retryable: boolean;
  readonly providerRequestId?: string;
  readonly cause?: unknown;

  constructor(
    code: AiErrorCode,
    message: string,
    options?: { retryable?: boolean; providerRequestId?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "AiEngineError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.providerRequestId = options?.providerRequestId;
    this.cause = options?.cause;
  }
}

export function isRetryableAiError(error: unknown): boolean {
  if (error instanceof AiEngineError) return error.retryable;
  return false;
}
