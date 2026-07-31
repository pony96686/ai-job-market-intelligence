export class IngestionError extends Error {
  retryable: boolean;

  constructor(message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = 'IngestionError';
    this.retryable = options.retryable ?? false;
  }
}
