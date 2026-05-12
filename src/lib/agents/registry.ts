import type { convertToModelMessages, InferUIMessageChunk } from "ai";
import type { MyUIMessage } from "@/types/ui-message";
import { COURT_REPORTER_AGENT_ID, courtReporterAgentConfig } from "./court-reporter-agent";

export type AgentStep = {
  finishReason?: string;
  text?: string;
  toolCalls?: Array<{ toolName: string }>;
  toolResults?: Array<{ toolName: string }>;
};

export type StreamAgent = {
  stream: (options: {
    messages: Awaited<ReturnType<typeof convertToModelMessages>>;
    onStepFinish: (step: AgentStep) => Promise<void>;
  }) => Promise<{
    toUIMessageStream: (options: {
      generateMessageId?: () => string;
      originalMessages: MyUIMessage[];
      onFinish: (result: { responseMessage: MyUIMessage }) => Promise<void>;
    }) => ReadableStream<InferUIMessageChunk<MyUIMessage>>;
  }>;
};

export type RegisteredAgentId = typeof COURT_REPORTER_AGENT_ID;

export type RegisteredAgent = {
  id: RegisteredAgentId;
  config: typeof courtReporterAgentConfig;
  agent: StreamAgent;
};

export type AgentRegistry = {
  get(agentId?: string): StreamAgent;
  list(): RegisteredAgent[];
};

export const createAgentRegistry = (agents: RegisteredAgent[]): AgentRegistry => ({
  get(agentId = COURT_REPORTER_AGENT_ID) {
    const match = agents.find((entry) => entry.id === agentId);
    if (!match) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    return match.agent;
  },
  list() {
    return [...agents];
  },
});

export const createDefaultAgentRegistry = async (): Promise<AgentRegistry> => {
  const { courtReporterAgent } = await import("./court-reporter-runtime");
  return createAgentRegistry([
    {
      id: COURT_REPORTER_AGENT_ID,
      config: courtReporterAgentConfig,
      agent: courtReporterAgent as unknown as StreamAgent,
    },
  ]);
};
