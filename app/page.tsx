import { nanoid } from "nanoid";
import type * as React from "react";
import { ChatInterface } from "@/components/chat-interface";

export default function Page(): React.JSX.Element {
  return <ChatInterface initialMessages={[]} threadId={nanoid()} />;
}
