import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
});

const userPool = backend.auth.resources.cfnResources.cfnUserPool;

userPool.adminCreateUserConfig = {
  ...userPool.adminCreateUserConfig,
  allowAdminCreateUserOnly: true,
};
