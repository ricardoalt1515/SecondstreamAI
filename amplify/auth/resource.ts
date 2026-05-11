import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: "Your SecondstreamAI invitation",
        emailBody: (username, code) => `You have been invited to SecondstreamAI.

Sign in with username ${username()} and temporary password ${code()}.

After first sign-in, follow the prompts to set your permanent password.`,
      },
    },
  },
});
