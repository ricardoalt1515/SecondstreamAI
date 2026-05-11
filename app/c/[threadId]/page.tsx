import { getThreadMessages } from "@app/actions/messages";
import type * as React from "react";
import { ChatInterface } from "@/components/chat-interface";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}): Promise<React.JSX.Element> {
  const { threadId } = await params;
  const { messages } = await getThreadMessages({ threadId });

  return <ChatInterface initialMessages={messages} threadId={threadId} />;
}
