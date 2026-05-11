import { describe, expect, it } from "vitest";
import { AuthRequiredError, toAuthRequiredError } from "./errors";

describe("auth error mapping", () => {
  it("maps Amplify unauthenticated exceptions to an auth-required error", () => {
    const error = toAuthRequiredError({ name: "UserUnAuthenticatedException" });

    expect(error).toBeInstanceOf(AuthRequiredError);
    if (!(error instanceof AuthRequiredError)) {
      throw new Error("Expected AuthRequiredError");
    }
    expect(error.message).toBe("Sign in to continue.");
  });

  it("does not hide non-auth errors", () => {
    const error = new Error("backend failed");

    expect(toAuthRequiredError(error)).toBe(error);
  });
});
