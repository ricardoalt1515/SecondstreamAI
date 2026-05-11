import * as React from "react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

vi.mock("./login-view", () => ({
  LoginView: () => ({ type: "LoginView", props: {} }),
}));

describe("login page", () => {
  it("renders the Amplify Auth login view", async () => {
    const { default: LoginPage } = await import("./page");
    const { LoginView } = await import("./login-view");

    const element = LoginPage() as { props: { children: unknown } };

    expect(element.props.children).toMatchObject({ type: LoginView, props: {} });
  });
});
