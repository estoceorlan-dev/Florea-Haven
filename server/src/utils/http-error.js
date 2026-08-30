export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}
