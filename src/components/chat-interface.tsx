"use client";

import { useChat } from "@ai-sdk/react";
import { cloneThread, type Thread } from "@app/actions/threads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type PrepareSendMessagesRequest } from "ai";
import { fetchAuthSession } from "aws-amplify/auth";
import { DownloadIcon, FileTextIcon, GitBranchIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useCallback } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Source, SourceContent, SourceTrigger } from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput } from "@/components/ai-elements/tool";
import { WorkingMemoryUpdate } from "@/components/ai-elements/working-memory-update";
import { ChatPromptComposer } from "@/components/chat-prompt-composer";
import { useDraftInput } from "@/hooks/use-draft-input";
import { canSubmitPromptMessage, shouldShowLoadingShimmer } from "@/lib/chat-utils";
import type { ArtifactToolUIResult, MyUIMessage } from "@/types/ui-message";
import { CopyButton } from "./copy-button";

const EMPTY_STATE_SUGGESTIONS = [
  "Summarize a recent water quality report",
  "Explain a current water regulation",
  "Draft a maintenance procedure",
] as const;

const ARTIFACT_TOOL_TITLES = {
  "tool-generateFieldBrief": "Field Brief",
  "tool-generatePlaybook": "Conversation Playbook",
  "tool-generateAnalyticalRead": "Analytical Read",
  "tool-generateProposalShell": "Proposal Shell",
} as const;

type ArtifactToolType = keyof typeof ARTIFACT_TOOL_TITLES;

type ArtifactToolPart = Extract<MyUIMessage["parts"][number], { type: ArtifactToolType }>;

const isArtifactToolPart = (part: MyUIMessage["parts"][number]): part is ArtifactToolPart =>
  part.type in ARTIFACT_TOOL_TITLES;

export function ArtifactDownloadCard({
  title,
  output,
}: {
  title: string;
  output: ArtifactToolUIResult | null | undefined;
}): React.JSX.Element {
  const pdf = output?.formats?.[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileTextIcon className="size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{output?.title ?? title}</p>
          <p className="truncate text-muted-foreground text-xs">{pdf?.filename ?? "PDF ready"}</p>
        </div>
      </div>
      {pdf?.downloadUrl ? (
        <a
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary text-xs hover:bg-primary/15"
          href={pdf.downloadUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <DownloadIcon className="size-3.5" />
          Download PDF
        </a>
      ) : null}
    </div>
  );
}

type ChatSendRequestInput = Pick<
  Parameters<PrepareSendMessagesRequest<MyUIMessage>>[0],
  "body" | "messageId" | "messages" | "trigger"
>;

const CHAT_LAMBDA_URL = "https://i2bquluu4ttmvzpuxva665dlye0tnunw.lambda-url.us-east-1.on.aws/";

type PreparedChatRequest = {
  body: object;
  headers?: Record<string, string>;
};

export const getChatTransportApi = (): string => CHAT_LAMBDA_URL;

const getAccessToken = async (): Promise<string> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new Error("No Cognito access token is available for Lambda chat transport.");
  }
  return token;
};

export const prepareChatSendMessagesRequest = ({
  body,
  messageId,
  messages,
  trigger,
}: ChatSendRequestInput): PreparedChatRequest | Promise<PreparedChatRequest> => {
  const requestBody = body ?? {};
  const preparedBody = {
    threadId: requestBody.threadId,
    messages,
    trigger,
    messageId,
    modelId: requestBody.modelId,
    webSearchEnabled:
      typeof requestBody.webSearchEnabled === "boolean" ? requestBody.webSearchEnabled : false,
  };

  return getAccessToken().then((token) => ({
    body: preparedBody,
    headers: { authorization: `Bearer ${token}` },
  }));
};

export function ChatRuntimeError({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
    >
      <p className="font-medium">Chat request failed</p>
      <p className="mt-1 text-destructive/90">{message}</p>
    </div>
  );
}

function isNewThreadCreatedData(data: unknown): data is MyUIMessage["metadata"] & {
  threadId: string;
  title: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "threadId" in data &&
    "title" in data &&
    "resourceId" in data &&
    "createdAt" in data &&
    "updatedAt" in data
  );
}

function isConversationTitleData(data: unknown): data is { title: string } {
  return typeof data === "object" && data !== null && "title" in data;
}

export function ChatInterface({
  initialMessages = [],
  threadId,
}: {
  initialMessages: MyUIMessage[];
  threadId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useDraftInput();

  const branchMutation = useMutation({
    mutationFn: (upToMessageId: string) => cloneThread({ sourceThreadId: threadId, upToMessageId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      router.push(`/c/${result.thread.id}`);
    },
  });

  const { messages, sendMessage, status, regenerate, error, clearError } = useChat<MyUIMessage>({
    id: threadId,
    messages: initialMessages,
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onData: (dataPart) => {
      if (dataPart.type === "data-new-thread-created" && isNewThreadCreatedData(dataPart.data)) {
        const newThread = dataPart.data;
        window.history.replaceState(window.history.state, "", `/c/${newThread.threadId}`);
        queryClient.setQueryData<{ threads: Thread[] }>(["threads"], (old) => {
          const thread: Thread = {
            id: newThread.threadId,
            title: newThread.title,
            resourceId: newThread.resourceId,
            createdAt: newThread.createdAt,
            updatedAt: newThread.updatedAt,
          };
          if (!old) return { threads: [thread] };
          if (old.threads.some((existingThread) => existingThread.id === thread.id)) {
            return old;
          }
          return { threads: [thread, ...old.threads] };
        });
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      }
      if (dataPart.type === "data-conversation-title" && isConversationTitleData(dataPart.data)) {
        const title = dataPart.data.title;
        queryClient.setQueryData<{ threads: Thread[] }>(["threads"], (old) => {
          if (!old) return old;
          return {
            threads: old.threads.map((t) => (t.id === threadId ? { ...t, title } : t)),
          };
        });
      }
    },
    transport: new DefaultChatTransport({
      api: getChatTransportApi(),
      body: {
        threadId,
      },
      prepareSendMessagesRequest: prepareChatSendMessagesRequest,
    }),
  });

  const isEmptyState = messages.length === 0;

  const handleSubmitMessage = useCallback(
    async (message: PromptInputMessage): Promise<void> => {
      if (!canSubmitPromptMessage(message)) {
        return;
      }

      clearError();

      await sendMessage(message, {
        body: {
          modelId: message.modelId,
          webSearchEnabled: message.webSearchEnabled,
        },
      });
    },
    [clearError, sendMessage],
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      void handleSubmitMessage({
        text,
        files: [],
        modelId: draft.modelId,
        webSearchEnabled: draft.webSearchEnabled,
      });
    },
    [handleSubmitMessage, draft.modelId, draft.webSearchEnabled],
  );

  return (
    <div className="relative flex h-full flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {isEmptyState ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative mx-auto flex w-full max-w-[70ch] flex-1 flex-col items-center justify-center gap-10 px-6 pb-24"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60%] bg-[radial-gradient(60%_70%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent)_0%,transparent_70%)]"
            />

            <div className="space-y-3 text-center">
              <h1 className="text-balance font-medium text-5xl text-foreground tracking-tight">
                Ask H2O Allegiant
              </h1>
              <p className="text-balance text-muted-foreground">
                Your water intelligence assistant.
              </p>
            </div>

            {error ? <ChatRuntimeError message={error.message} /> : null}

            <ChatPromptComposer
              className="w-full"
              errorMessage={error?.message ?? null}
              onInteract={() => {
                if (error) {
                  clearError();
                }
              }}
              onSubmitMessage={handleSubmitMessage}
              placeholder="Ask anything about water"
              status={status}
              textareaClassName="min-h-16 text-lg"
            />

            <Suggestions className="w-full">
              {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  suggestion={suggestion}
                  onClick={handleSuggestionClick}
                  className="border-primary/15 text-muted-foreground hover:border-primary/35 hover:bg-primary/5 hover:text-foreground hover:shadow-[0_4px_24px_-12px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
                />
              ))}
            </Suggestions>
          </motion.div>
        ) : (
          <motion.div
            key="conversation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="mx-auto w-full max-w-[70ch] gap-8 px-6 py-6">
                {messages.map(
                  (message, index): React.JSX.Element => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(index * 0.04, 0.2),
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      <Message from={message.role}>
                        <MessageContent>
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "file": {
                                const isImage = part.mediaType.startsWith("image/");

                                if (isImage) {
                                  return (
                                    <div key={`${message.id}-${i}`} className="mb-2">
                                      <Image
                                        alt={part.filename ?? "Uploaded image"}
                                        className="max-h-80 rounded-lg border object-contain"
                                        height={320}
                                        src={part.url}
                                        unoptimized
                                        width={640}
                                      />
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                                  >
                                    <span className="font-medium">Attachment:</span>
                                    <span>{part.filename ?? part.mediaType}</span>
                                  </div>
                                );
                              }
                              case "reasoning":
                                return (
                                  <Reasoning
                                    key={`${message.id}-${i}`}
                                    isStreaming={part.state === "streaming"}
                                  >
                                    <ReasoningTrigger />
                                    <ReasoningContent>{part.text}</ReasoningContent>
                                  </Reasoning>
                                );
                              case "text":
                                return (
                                  <MessageResponse key={`${message.id}-${i}`}>
                                    {part.text}
                                  </MessageResponse>
                                );
                              case "tool-webSearch":
                                return part.state === "output-available" ? (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="not-prose mb-4 flex flex-wrap gap-2"
                                  >
                                    {part.output.map((source, index) => (
                                      <Source key={source.url} href={source.url}>
                                        <SourceTrigger showFavicon label={index + 1} />
                                        <SourceContent
                                          title={source.title ?? source.url}
                                          description={source.content}
                                        />
                                      </Source>
                                    ))}
                                  </div>
                                ) : (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5"
                                  >
                                    <GlobeIcon className="size-3.5 text-primary" />
                                    <Shimmer as="span" className="text-foreground/85 text-sm">
                                      {`Searching for: ${part.state === "input-available" ? part.input.query : "…"}`}
                                    </Shimmer>
                                  </div>
                                );
                              case "tool-updateWorkingMemory":
                                return (
                                  <WorkingMemoryUpdate
                                    key={`${message.id}-${i}`}
                                    state={part.state}
                                    input={
                                      part.state !== "input-streaming" ? part.input : undefined
                                    }
                                  />
                                );
                              default: {
                                if (!isArtifactToolPart(part)) {
                                  return null;
                                }
                                const artifactTitle = ARTIFACT_TOOL_TITLES[part.type];
                                return (
                                  <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                                    <ToolHeader
                                      state={part.state}
                                      title={artifactTitle}
                                      type={part.type}
                                    />
                                    <ToolContent>
                                      {part.state === "output-available" ? (
                                        <ArtifactDownloadCard
                                          output={part.output}
                                          title={artifactTitle}
                                        />
                                      ) : null}
                                      {part.state !== "input-streaming" ? (
                                        <ToolInput input={part.input} />
                                      ) : null}
                                      {part.state === "output-error" ? (
                                        <p className="text-destructive text-sm">
                                          {part.errorText ?? "Generation failed."}
                                        </p>
                                      ) : null}
                                    </ToolContent>
                                  </Tool>
                                );
                              }
                            }
                          })}
                        </MessageContent>
                        {message.role === "assistant" && (
                          <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100">
                            <CopyButton
                              text={message.parts
                                .filter((p) => p.type === "text")
                                .map((p) => p.text)
                                .join("\n")}
                            />
                            <MessageAction
                              tooltip="Branch from here"
                              onClick={() => {
                                branchMutation.mutate(message.id);
                              }}
                            >
                              <GitBranchIcon className="size-3" />
                            </MessageAction>
                            <MessageAction
                              tooltip="Regenerate"
                              onClick={() => {
                                regenerate({ messageId: message.id });
                              }}
                            >
                              <RefreshCcwIcon className="size-3" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    </motion.div>
                  ),
                )}

                {shouldShowLoadingShimmer(status, messages) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.15,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <Message from="assistant">
                      <MessageContent>
                        <Shimmer as="p" className="text-sm">
                          Thinking…
                        </Shimmer>
                      </MessageContent>
                    </Message>
                  </motion.div>
                )}

                {error ? <ChatRuntimeError message={error.message} /> : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
              <ChatPromptComposer
                className="w-full"
                errorMessage={error?.message ?? null}
                onInteract={() => {
                  if (error) {
                    clearError();
                  }
                }}
                onSubmitMessage={handleSubmitMessage}
                placeholder="Say something..."
                status={status}
                textareaClassName="min-h-14"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
