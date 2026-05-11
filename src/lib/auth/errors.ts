export class AuthRequiredError extends Error {
  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

const AUTH_ERROR_NAMES = new Set([
  "UserUnAuthenticatedException",
  "NotAuthorizedException",
  "AuthTokenConfigException",
]);

export function isAuthRequiredError(error: unknown): boolean {
  if (error instanceof AuthRequiredError) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return AUTH_ERROR_NAMES.has(String(error.name));
}

export function toAuthRequiredError(error: unknown): unknown {
  return isAuthRequiredError(error) ? new AuthRequiredError() : error;
}
