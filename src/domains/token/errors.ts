export class InvalidAudienceError extends Error {
  constructor(product: string) {
    super(`Unknown product: ${product}`);
    this.name = 'InvalidAudienceError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Invalid or expired session') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NoSigningKeyError extends Error {
  constructor() {
    super('No signing key available');
    this.name = 'NoSigningKeyError';
  }
}

export class SigningKeyImportError extends Error {
  constructor() {
    super('Failed to load signing key');
    this.name = 'SigningKeyImportError';
  }
}
