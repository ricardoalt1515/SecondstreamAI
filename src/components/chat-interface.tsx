"use client";

import { useChat } from "@ai-sdk/react";
import { cloneThread, type Thread } from "@app/actions/threads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type PrepareSendMessagesRequest } from "ai";
import { GitBranchIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
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
import { DiscoveryReportBundle } from "@/components/ai-elements/discovery-report-bundle";
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
import { WorkingMemoryUpdate } from "@/components/ai-elements/working-memory-update";
import { ChatPromptComposer } from "@/components/chat-prompt-composer";
import { canSubmitPromptMessage, shouldShowLoadingShimmer } from "@/lib/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";
import { CopyButton } from "./copy-button";

type ChatSendRequestInput = Pick<
  Parameters<PrepareSendMessagesRequest<MyUIMessage>>[0],
  "body" | "messageId" | "messages" | "trigger"
>;

export const prepareChatSendMessagesRequest = ({
  body,
  messageId,
  messages,
  trigger,
}: ChatSendRequestInput): { body: object } => {
  const requestBody = body ?? {};

  return {
    body: {
      threadId: requestBody.threadId,
      messages,
      trigger,
      messageId,
      modelId: requestBody.modelId,
      webSearchEnabled:
        typeof requestBody.webSearchEnabled === "boolean" ? requestBody.webSearchEnabled : false,
    },
  };
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

export function ChatInterface({
  initialMessages = [],
  threadId,
}: {
  initialMessages: MyUIMessage[];
  threadId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      if (dataPart.type === "data-new-thread-created") {
        queryClient.setQueryData<{ threads: Thread[] }>(["threads"], (old) => {
          const newThread: Thread = {
            id: dataPart.data.threadId,
            title: dataPart.data.title,
            resourceId: dataPart.data.resourceId,
            createdAt: dataPart.data.createdAt,
            updatedAt: dataPart.data.updatedAt,
          };
          if (!old) return { threads: [newThread] };
          return { threads: [newThread, ...old.threads] };
        });
      }
      if (dataPart.type === "data-conversation-title") {
        queryClient.setQueryData<{ threads: Thread[] }>(["threads"], (old) => {
          if (!old) return old;
          return {
            threads: old.threads.map((t) =>
              t.id === threadId ? { ...t, title: dataPart.data.title } : t,
            ),
          };
        });
      }
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
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

      if (isEmptyState) {
        router.replace(`/c/${threadId}`);
      }
    },
    [clearError, sendMessage, threadId, isEmptyState, router],
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {isEmptyState ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-auto flex w-full max-w-[70ch] flex-1 flex-col items-center justify-center gap-14 px-6 pb-24"
          >
            <h1 className="text-foreground text-5xl font-medium tracking-tight">
              What can I help with?
            </h1>
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
              placeholder="Ask anything"
              status={status}
              textareaClassName="min-h-16 text-lg"
            />
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
                                    className="flex items-center gap-1.5"
                                  >
                                    <GlobeIcon className="text-muted-foreground size-3.5" />
                                    <Shimmer as="p" className="text-sm">
                                      {`Searching for: ${part.state === "input-available" ? part.input.query : "..."}`}
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
                              case "tool-generateDiscoveryReportBundle":
                                return (
                                  <DiscoveryReportBundle
                                    key={`${message.id}-${i}`}
                                    state={part.state}
                                    input={
                                      part.state === "input-available" ||
                                      part.state === "output-available"
                                        ? part.input
                                        : undefined
                                    }
                                    output={
                                      part.state === "output-available" ? part.output : undefined
                                    }
                                  />
                                );
                              default:
                                return null;
                            }
                          })}
                        </MessageContent>
                        {message.role === "assistant" && (
                          <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
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
                          Thinking...
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
