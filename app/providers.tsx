"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import type * as React from "react";
import { useState } from "react";
import { createAmplifyClientLibraryOptions } from "@/config/amplify-client";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs, createAmplifyClientLibraryOptions());

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Authenticator.Provider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Authenticator.Provider>
  );
}
