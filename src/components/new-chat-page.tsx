"use client";

import { nanoid } from "nanoid";
import type * as React from "react";
import { useMemo } from "react";
import { ChatInterface } from "@/components/chat-interface";

export function NewChatPage({ resetKey }: { resetKey: string }): React.JSX.Element {
  const threadId = useMemo(() => nanoid(), [resetKey]);

  return <ChatInterface key={resetKey} initialMessages={[]} threadId={threadId} />;
}
