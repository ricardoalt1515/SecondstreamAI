import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { assertAmplifyOutputsConfigured } from "@/config/amplify-runtime";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { toAuthRequiredError } from "@/lib/auth/errors";

export type OwnerContext = {
  userId: string;
  identityId: string;
};

export async function getCurrentOwner(): Promise<OwnerContext> {
  assertAmplifyOutputsConfigured();

  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const [user, session] = await Promise.all([
          getCurrentUser(contextSpec),
          fetchAuthSession(contextSpec),
        ]);

        const identityId = session.identityId ?? user.userId;
        return {
          userId: user.userId,
          identityId,
        };
      },
    });
  } catch (error) {
    throw toAuthRequiredError(error);
  }
}

export { runWithAmplifyServerContext };
