/**
 * Error thrown when the MemLib API returns a non-2xx response.
 */
export class MemLibError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Parsed response body (if available) */
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "MemLibError";
    this.status = status;
    this.body = body;
  }
}
