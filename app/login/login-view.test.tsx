/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginView } from "./login-view";

const authenticatorMock = vi.hoisted(() => vi.fn(() => <div data-testid="authenticator" />));

vi.mock("@aws-amplify/ui-react", () => ({
  Authenticator: authenticatorMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("LoginView", () => {
  it("renders Amplify Authenticator as sign-in only with email login", () => {
    authenticatorMock.mockClear();

    render(<LoginView />);

    expect(authenticatorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hideSignUp: true,
        initialState: "signIn",
        loginMechanisms: ["email"],
      }),
      undefined,
    );
  });
});
