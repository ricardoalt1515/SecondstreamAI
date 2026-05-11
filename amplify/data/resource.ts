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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
