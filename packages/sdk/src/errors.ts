/**
 * Error thrown when the MemZ API returns a non-2xx response.
 */
export class MemZError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Parsed response body (if available) */
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "MemZError";
    this.status = status;
    this.body = body;
  }
}
