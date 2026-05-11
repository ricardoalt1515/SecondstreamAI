import type { LibraryOptions } from "@aws-amplify/core";
import { parseAmplifyConfig } from "@aws-amplify/core/internals/utils";
import { createAWSCredentialsAndIdentityIdProvider } from "aws-amplify/adapter-core";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { CookieStorage } from "aws-amplify/utils";
import outputs from "../../amplify_outputs.json";

const isLocalHttpDev =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  window.location.protocol === "http:";

const createClientCookieStorage = (): CookieStorage =>
  new CookieStorage({
    path: "/",
    sameSite: "lax",
    secure: !isLocalHttpDev,
  });

export const createAmplifyClientLibraryOptions = (): LibraryOptions => {
  const authConfig = parseAmplifyConfig(outputs).Auth;

  if (!authConfig) {
    return { ssr: true };
  }

  const cookieStorage = createClientCookieStorage();
  cognitoUserPoolsTokenProvider.setAuthConfig(authConfig);
  cognitoUserPoolsTokenProvider.setKeyValueStorage(cookieStorage);

  return {
    ssr: true,
    Auth: {
      tokenProvider: cognitoUserPoolsTokenProvider,
      credentialsProvider: createAWSCredentialsAndIdentityIdProvider(authConfig, cookieStorage),
    },
  };
};
