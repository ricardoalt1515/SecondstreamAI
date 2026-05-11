import { defineStorage } from "@aws-amplify/backend";

export const AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH = "private/{entity_id}/*";

export const storage = defineStorage({
  name: "secondstreamPrivateFiles",
  access: (allow) => ({
    // Amplify Gen 2 requires {entity_id} to be the final path part before /*.
    // App keys may still nest session files below the owned private root, e.g.
    // private/<identityId>/sessions/<threadId>/<file>.
    [AMPLIFY_PRIVATE_STORAGE_ACCESS_PATH]: [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
