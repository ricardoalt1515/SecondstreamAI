import { stepCountIs, ToolLoopAgent, type ToolSet } from "ai";
import { h2oAllegiantPrompt } from "@/ai/prompts/h2o-allegiant";
import { loadSkillTool } from "@/ai/tools/load-skill";
import { MODELS } from "@/config/models";
import { bedrockProvider } from "@/lib/bedrock-provider";

// Exported so chat-handler can build the system message with Bedrock cachePoint.
// The agent no longer holds `instructions` — chat-handler prepends a system message
// per call so we can attach providerOptions.bedrock.cachePoint to it.
export const H2O_AGENT_INSTRUCTIONS = h2oAllegiantPrompt.trim();

// Worst case opportunity-advancing turn: loadSkill + 4 generate* + 1 closing reply.
// Cap at 8 so a confused model can't loop indefinitely and burn Bedrock budget.
const AGENT_MAX_STEPS = 8;

// Sonnet 4.6 supports up to 64K output tokens; cap at 32K to leave headroom for
// large tool-call payloads (Field Brief JSON ~3-4K) plus a long closing reply
// without giving the model unlimited budget on a single step.
const AGENT_MAX_OUTPUT_TOKENS = 32_768;

type CreateAgentOptions = {
  tools?: ToolSet;
};

export const createAgent = ({ tools = {} }: CreateAgentOptions = {}) =>
  new ToolLoopAgent({
    model: bedrockProvider(MODELS[0].runtimeModelId),
    stopWhen: stepCountIs(AGENT_MAX_STEPS),
    maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
    tools: {
      loadSkill: loadSkillTool,
      ...tools,
    },
    onStepFinish: ({ toolCalls, finishReason }) => {
      const toolNames = toolCalls.map((call) => call.toolName).join(",") || "none";
      console.log("[agent] step:finish", { finishReason, tools: toolNames });
    },
  });

export const agent = createAgent();

export type Agent = ReturnType<typeof createAgent>;
