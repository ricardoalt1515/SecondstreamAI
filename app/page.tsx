import type * as React from "react";
import { NewChatPage } from "@/components/new-chat-page";

type PageProps = {
  searchParams: Promise<{ new?: string }>;
};

export default async function Page({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const resetKey = params.new ?? "initial";

  return <NewChatPage resetKey={resetKey} />;
}
