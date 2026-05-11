"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/use-theme";
import { Providers } from "./providers";

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Providers>
        {isLoginRoute ? (
          children
        ) : (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="bg-background border-b px-3 py-2 md:hidden">
                <SidebarTrigger />
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        )}
      </Providers>
      <Toaster />
    </ThemeProvider>
  );
}
