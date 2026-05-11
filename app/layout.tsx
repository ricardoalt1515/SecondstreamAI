import "@aws-amplify/ui-react/styles.css";
import "../src/styles.css";
import type { Metadata } from "next";
import type * as React from "react";
import { AppShell } from "./shell";

export const metadata: Metadata = {
  title: "SecondstreamAI",
  description: "AI chat workspace powered by Next.js, Amplify Gen 2, and AI SDK.",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
