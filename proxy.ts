import { fetchAuthSession } from "aws-amplify/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";

const PUBLIC_FILE_PATTERN = /\.(?:css|gif|ico|jpg|jpeg|js|png|svg|txt|webmanifest|woff2?)$/;
const AUTH_BYPASS_PREFIXES = ["/api/chat", "/_next", "/favicon.ico"];
const LOGIN_PATH = "/login";

export function isAuthBypassPath(pathname: string): boolean {
  return (
    pathname === LOGIN_PATH ||
    pathname === "/amplify_outputs.json" ||
    PUBLIC_FILE_PATTERN.test(pathname) ||
    AUTH_BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function isProtectedAppPath(pathname: string): boolean {
  return !isAuthBypassPath(pathname);
}

async function hasServerSession(request: NextRequest, response: NextResponse): Promise<boolean> {
  return runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      const session = await fetchAuthSession(contextSpec);
      return Boolean(session.tokens?.accessToken);
    },
  });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  if (isAuthBypassPath(pathname)) {
    return response;
  }

  const isAuthenticated = await hasServerSession(request, response);

  if (!isAuthenticated && isProtectedAppPath(pathname)) {
    const redirectUrl = new URL(LOGIN_PATH, request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|gif|ico|jpg|jpeg|js|png|svg|txt|webmanifest|woff2?)$).*)",
  ],
};
