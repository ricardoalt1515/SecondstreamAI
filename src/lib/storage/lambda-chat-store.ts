import {
  type AttributeValue,
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  type DynamoDBClientConfig,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { nanoid } from "nanoid";
import type { ChatStore, StoredThread } from "@/lib/storage/chat-store-types";
import type { MyUIMessage } from "@/types/ui-message";

export type LambdaDynamoDbClient = Pick<DynamoDBClient, "send">;

export type LambdaDynamoDbChatStoreConfig = {
  client: LambdaDynamoDbClient;
  sessionTableName: string;
  messageTableName: string;
  sessionUserIdIndexName: string;
  messageSessionIdIndexName: string;
  now?: () => Date;
  idFactory?: () => string;
};

export type LambdaDynamoDbChatStoreEnv = {
  LAMBDA_CHAT_SESSION_TABLE_NAME?: string;
  LAMBDA_CHAT_MESSAGE_TABLE_NAME?: string;
  LAMBDA_CHAT_SESSION_USER_ID_INDEX_NAME?: string;
  LAMBDA_CHAT_MESSAGE_SESSION_ID_INDEX_NAME?: string;
  AWS_REGION?: string;
};

type SessionItem = {
  id: string;
  userId: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  __typename?: "Session";
};

type MessageItem = {
  id: string;
  sessionId: string;
  position: number;
  role: string;
  payloadJson: MyUIMessage | string;
  createdAt: string;
  updatedAt?: string;
  owner?: string;
  __typename?: "Message";
};

const isStoredUIMessage = (value: unknown): value is MyUIMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { role?: unknown; parts?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system") &&
    Array.isArray(candidate.parts)
  );
};

const toThread = (session: SessionItem): StoredThread => ({
  id: session.id,
  resourceId: session.userId,
  title: session.title ?? null,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const appSyncOwner = (userId: string): string => `${userId}::${userId}`;

const marshallItem = (value: object): Record<string, AttributeValue> =>
  marshall(value, { removeUndefinedValues: true });

const parseMessagePayload = (message: MessageItem): MyUIMessage | null => {
  const parsed =
    typeof message.payloadJson === "string"
      ? (() => {
          try {
            return JSON.parse(message.payloadJson) as unknown;
          } catch {
            return null;
          }
        })()
      : message.payloadJson;

  return isStoredUIMessage(parsed) ? structuredClone(parsed) : null;
};

const requiredEnv = (env: LambdaDynamoDbChatStoreEnv, name: keyof LambdaDynamoDbChatStoreEnv) => {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required Lambda ChatStore environment variable: ${name}`);
  }
  return value;
};

export const createLambdaDynamoDbChatStoreFromEnv = (
  env: LambdaDynamoDbChatStoreEnv = process.env as LambdaDynamoDbChatStoreEnv,
  clientConfig: DynamoDBClientConfig = {},
): ChatStore =>
  createLambdaDynamoDbChatStore({
    client: new DynamoDBClient({ region: env.AWS_REGION, ...clientConfig }),
    messageSessionIdIndexName: requiredEnv(env, "LAMBDA_CHAT_MESSAGE_SESSION_ID_INDEX_NAME"),
    messageTableName: requiredEnv(env, "LAMBDA_CHAT_MESSAGE_TABLE_NAME"),
    sessionTableName: requiredEnv(env, "LAMBDA_CHAT_SESSION_TABLE_NAME"),
    sessionUserIdIndexName: requiredEnv(env, "LAMBDA_CHAT_SESSION_USER_ID_INDEX_NAME"),
  });

export const createLambdaDynamoDbChatStore = ({
  client,
  idFactory = nanoid,
  messageSessionIdIndexName,
  messageTableName,
  now = () => new Date(),
  sessionTableName,
  sessionUserIdIndexName,
}: LambdaDynamoDbChatStoreConfig): ChatStore => {
  const nowIso = () => now().toISOString();

  const listMessageRows = async (threadId: string): Promise<MessageItem[]> => {
    const result = await client.send(
      new QueryCommand({
        ExpressionAttributeNames: { "#sessionId": "sessionId" },
        ExpressionAttributeValues: marshallItem({ ":sessionId": threadId }),
        IndexName: messageSessionIdIndexName,
        KeyConditionExpression: "#sessionId = :sessionId",
        TableName: messageTableName,
      }),
    );

    return (result.Items ?? [])
      .map((item) => unmarshall(item) as MessageItem)
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  };

  const putMessageRows = async (
    threadId: string,
    userId: string,
    messages: MyUIMessage[],
  ): Promise<void> => {
    if (messages.length === 0) {
      return;
    }

    await client.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [messageTableName]: messages.map((message, position) => {
            const timestamp = nowIso();
            return {
              PutRequest: {
                Item: marshallItem({
                  __typename: "Message",
                  createdAt: timestamp,
                  id: message.id,
                  owner: appSyncOwner(userId),
                  payloadJson: message,
                  position,
                  role: message.role,
                  sessionId: threadId,
                  updatedAt: timestamp,
                } satisfies MessageItem),
              },
            };
          }),
        },
      }),
    );
  };

  const bumpUpdatedAt = async (threadId: string): Promise<void> => {
    await client.send(
      new UpdateItemCommand({
        ExpressionAttributeNames: { "#title": "title", "#updatedAt": "updatedAt" },
        ExpressionAttributeValues: marshallItem({
          ":title": (await getThreadById(threadId))?.title ?? null,
          ":updatedAt": nowIso(),
        }),
        Key: marshallItem({ id: threadId }),
        TableName: sessionTableName,
        UpdateExpression: "SET #title = :title, #updatedAt = :updatedAt",
      }),
    );
  };

  const getThreadById = async (threadId: string): Promise<StoredThread | null> => {
    const result = await client.send(
      new GetItemCommand({
        Key: marshallItem({ id: threadId }),
        TableName: sessionTableName,
      }),
    );

    return result.Item ? toThread(unmarshall(result.Item) as SessionItem) : null;
  };

  return {
    async getThreadMessages(threadId: string): Promise<MyUIMessage[]> {
      const messages = await listMessageRows(threadId);
      return messages
        .map(parseMessagePayload)
        .filter((message): message is MyUIMessage => Boolean(message));
    },

    async saveMessage(threadId: string, message: MyUIMessage): Promise<void> {
      const thread = await getThreadById(threadId);
      if (!thread) {
        return;
      }

      const messages = await listMessageRows(threadId);
      const timestamp = nowIso();
      await client.send(
        new PutItemCommand({
          Item: marshallItem({
            __typename: "Message",
            createdAt: timestamp,
            id: message.id,
            owner: appSyncOwner(thread.resourceId),
            payloadJson: message,
            position: messages.length,
            role: message.role,
            sessionId: threadId,
            updatedAt: timestamp,
          } satisfies MessageItem),
          TableName: messageTableName,
        }),
      );
      await bumpUpdatedAt(threadId);
    },

    async createThread(id: string, resourceId: string, title?: string): Promise<StoredThread> {
      const timestamp = nowIso();
      const session: SessionItem = {
        __typename: "Session",
        createdAt: timestamp,
        id,
        owner: appSyncOwner(resourceId),
        title: title ?? null,
        updatedAt: timestamp,
        userId: resourceId,
      };

      await client.send(
        new PutItemCommand({
          Item: marshallItem(session),
          TableName: sessionTableName,
        }),
      );

      return toThread(session);
    },

    getThreadById,

    async updateThreadTitle(threadId: string, title: string): Promise<void> {
      await client.send(
        new UpdateItemCommand({
          ExpressionAttributeNames: { "#title": "title", "#updatedAt": "updatedAt" },
          ExpressionAttributeValues: marshallItem({ ":title": title, ":updatedAt": nowIso() }),
          Key: marshallItem({ id: threadId }),
          TableName: sessionTableName,
          UpdateExpression: "SET #title = :title, #updatedAt = :updatedAt",
        }),
      );
    },

    async listThreads(userId: string): Promise<StoredThread[]> {
      const result = await client.send(
        new QueryCommand({
          ExpressionAttributeNames: { "#userId": "userId" },
          ExpressionAttributeValues: marshallItem({ ":userId": userId }),
          IndexName: sessionUserIdIndexName,
          KeyConditionExpression: "#userId = :userId",
          TableName: sessionTableName,
        }),
      );

      return (result.Items ?? [])
        .map((item) => toThread(unmarshall(item) as SessionItem))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    async deleteThread(threadId: string): Promise<void> {
      const messages = await listMessageRows(threadId);
      if (messages.length > 0) {
        await client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [messageTableName]: messages.map((message) => ({
                DeleteRequest: { Key: marshallItem({ id: message.id }) },
              })),
            },
          }),
        );
      }

      await client.send(
        new DeleteItemCommand({
          Key: marshallItem({ id: threadId }),
          TableName: sessionTableName,
        }),
      );
    },

    async replaceAssistantMessageAfter(
      threadId: string,
      messageId: string,
      nextAssistantMessage: MyUIMessage,
    ): Promise<void> {
      const thread = await getThreadById(threadId);
      if (!thread) {
        return;
      }

      const messageRows = await listMessageRows(threadId);
      const targetIndex = messageRows.findIndex((message) => message.id === messageId);
      if (targetIndex === -1) {
        return;
      }

      if (messageRows.length > 0) {
        await client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [messageTableName]: messageRows.map((message) => ({
                DeleteRequest: { Key: marshallItem({ id: message.id }) },
              })),
            },
          }),
        );
      }

      const nextMessages = [
        ...messageRows
          .slice(0, targetIndex)
          .map(parseMessagePayload)
          .filter((message): message is MyUIMessage => Boolean(message)),
        nextAssistantMessage,
      ];

      await putMessageRows(threadId, thread.resourceId, nextMessages);
      await bumpUpdatedAt(threadId);
    },

    async cloneThread(
      sourceThreadId: string,
      resourceId: string,
      upToMessageId?: string,
    ): Promise<StoredThread> {
      const source = await getThreadById(sourceThreadId);
      if (!source) {
        throw new Error("Source thread not found");
      }

      const nextThread = await this.createThread(
        idFactory(),
        resourceId,
        source.title ?? undefined,
      );
      const sourceMessages = await this.getThreadMessages(sourceThreadId);
      const targetIndex = upToMessageId
        ? sourceMessages.findIndex((message) => message.id === upToMessageId)
        : -1;
      const messagesToCopy =
        targetIndex === -1 ? sourceMessages : sourceMessages.slice(0, targetIndex + 1);

      for (const message of messagesToCopy) {
        await this.saveMessage(nextThread.id, message);
      }

      return nextThread;
    },
  };
};
