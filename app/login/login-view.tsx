"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useId } from "react";
import { OpenChatLogo } from "@/components/openchat-logo";
import { Button } from "@/components/ui/button";

function SignedInRedirect(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  useEffect(() => {
    router.replace(next.startsWith("/") ? next : "/");
  }, [next, router]);

  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
      <OpenChatLogo className="mx-auto h-8 w-auto" />
      <h1 className="mt-6 font-semibold text-foreground text-xl">You're signed in</h1>
      <p className="mt-2 text-muted-foreground text-sm">Taking you back to your workspace…</p>
      <Button className="mt-6 w-full" type="button" onClick={() => router.replace("/")}>
        Go to workspace
      </Button>
    </div>
  );
}

export function LoginView(): React.JSX.Element {
  const headingId = useId();

  return (
    <section className="w-full max-w-md" aria-labelledby={headingId}>
      <div className="mb-8 text-center">
        <OpenChatLogo className="mx-auto h-9 w-auto" />
        <h1 id={headingId} className="mt-6 font-semibold text-2xl text-foreground">
          Sign in to SecondstreamAI
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Your private AI chat workspace is protected by Amplify Auth.
        </p>
      </div>
      <Authenticator
        hideSignUp
        initialState="signIn"
        loginMechanisms={["email"]}
        signUpAttributes={["email"]}
      >
        <SignedInRedirect />
      </Authenticator>
    </section>
  );
}
