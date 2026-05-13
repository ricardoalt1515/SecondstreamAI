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
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-600/15">
        <svg
          aria-hidden
          className="size-5 text-brand-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <title>Signed in</title>
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="space-y-1.5">
        <h2 className="font-semibold text-foreground text-lg">You're signed in</h2>
        <p className="text-muted-foreground text-sm">Taking you back to your workspace…</p>
      </div>
      <Button
        className="mt-2 w-full bg-brand-600 text-white hover:bg-brand-500"
        type="button"
        onClick={() => router.replace("/")}
      >
        Go to workspace
      </Button>
    </div>
  );
}

export function LoginView(): React.JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="relative w-full max-w-md">
      <div
        aria-hidden
        className="-inset-x-12 -top-24 pointer-events-none absolute h-72 bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-600)_0%,transparent_70%)] opacity-35 blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-10">
        <div
          aria-hidden
          className="-translate-x-1/2 pointer-events-none absolute top-0 left-1/2 h-px w-3/5 bg-gradient-to-r from-transparent via-brand-400/60 to-transparent"
        />

        <div className="flex flex-col items-center text-center">
          <OpenChatLogo className="h-9 w-auto" />
          <h1 id={headingId} className="mt-7 font-semibold text-2xl text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 max-w-sm text-muted-foreground text-sm">
            Sign in to continue to your private AI workspace.
          </p>
        </div>

        <div className="mt-8">
          <Authenticator
            hideSignUp
            initialState="signIn"
            loginMechanisms={["email"]}
            signUpAttributes={["email"]}
          >
            <SignedInRedirect />
          </Authenticator>
        </div>
      </div>

      <p className="mt-6 text-center text-muted-foreground text-xs">
        Protected by enterprise-grade authentication.
      </p>
    </section>
  );
}
