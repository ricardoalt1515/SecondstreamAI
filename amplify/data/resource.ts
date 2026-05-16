import { a, type ClientSchema, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  User: a
    .model({
      email: a.string(),
      displayName: a.string(),
      sessions: a.hasMany("Session", "userId"),
      agentConfigs: a.hasMany("AgentConfig", "userId"),
    })
    .authorization((allow) => [allow.owner()]),
  AgentConfig: a
    .model({
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      agentId: a.string().required(),
      name: a.string().required(),
      configJson: a.json(),
    })
    .authorization((allow) => [allow.owner()]),
  Session: a
    .model({
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      title: a.string(),
      messages: a.hasMany("Message", "sessionId"),
      files: a.hasMany("File", "sessionId"),
      outputs: a.hasMany("GeneratedOutput", "sessionId"),
      artifacts: a.hasMany("Artifact", "threadId"),
    })
    .authorization((allow) => [allow.owner()]),
  Message: a
    .model({
      sessionId: a.id().required(),
      session: a.belongsTo("Session", "sessionId"),
      position: a.integer().required(),
      role: a.string().required(),
      payloadJson: a.json().required(),
      files: a.hasMany("File", "messageId"),
      outputs: a.hasMany("GeneratedOutput", "messageId"),
    })
    .secondaryIndexes((index) => [index("sessionId")])
    .authorization((allow) => [allow.owner()]),
  File: a
    .model({
      sessionId: a.id().required(),
      session: a.belongsTo("Session", "sessionId"),
      messageId: a.id(),
      message: a.belongsTo("Message", "messageId"),
      storagePath: a.string().required(),
      filename: a.string(),
      mediaType: a.string().required(),
      sizeBytes: a.integer().required(),
    })
    .authorization((allow) => [allow.owner()]),
  GeneratedOutput: a
    .model({
      sessionId: a.id().required(),
      session: a.belongsTo("Session", "sessionId"),
      messageId: a.id(),
      message: a.belongsTo("Message", "messageId"),
      storagePath: a.string(),
      mediaType: a.string(),
      title: a.string(),
      metadataJson: a.json(),
    })
    .authorization((allow) => [allow.owner()]),
  Artifact: a
    .model({
      userId: a.id().required(),
      threadId: a.id().required(),
      thread: a.belongsTo("Session", "threadId"),
      kind: a.string().required(),
      status: a.enum(["ready", "failed"]),
      title: a.string().required(),
      customerSlug: a.string(),
      payloadVersion: a.integer().required(),
      payload: a.json().required(),
      createdAtIso: a.string().required(),
      updatedAtIso: a.string().required(),
    })
    .secondaryIndexes((index) => [index("threadId"), index("userId")])
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
