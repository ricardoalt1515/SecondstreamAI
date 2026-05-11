import type * as React from "react";
import { LoginView } from "./login-view";

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <LoginView />
    </main>
  );
}
