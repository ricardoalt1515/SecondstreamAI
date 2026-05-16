import type { ToolSet } from "ai";
import { describe, expect, it, vi } from "vitest";

const toolLoopAgentMock = vi.hoisted(() => vi.fn());
const stepCountIsMock = vi.hoisted(() => vi.fn((count: number) => ({ __stopAt: count })));

vi.mock("ai", () => ({
  ToolLoopAgent: toolLoopAgentMock,
  stepCountIs: stepCountIsMock,
  tool: vi.fn((config: unknown) => config),
}));
vi.mock("@/lib/bedrock-provider", () => ({ bedrockProvider: vi.fn((id: string) => ({ id })) }));

const { createAgent } = await import("./agent");

describe("createAgent", () => {
  it("preserves loadSkill while adding request-scoped artifact tools", () => {
    const artifactTool = { description: "artifact" } as unknown as ToolSet[string];

    createAgent({ tools: { generateFieldBrief: artifactTool } });

    expect(toolLoopAgentMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({
          loadSkill: expect.anything(),
          generateFieldBrief: artifactTool,
        }),
      }),
    );
  });

  it("caps step count and wires an onStepFinish callback", () => {
    createAgent();

    expect(stepCountIsMock).toHaveBeenCalledWith(8);
    const settings = toolLoopAgentMock.mock.calls.at(-1)?.[0];
    expect(settings).toEqual(
      expect.objectContaining({
        stopWhen: { __stopAt: 8 },
        onStepFinish: expect.any(Function),
        maxOutputTokens: 32_768,
      }),
    );
  });

  it("does not set `instructions` so the system message can be supplied per call with providerOptions", () => {
    createAgent();
    const settings = toolLoopAgentMock.mock.calls.at(-1)?.[0];
    expect(settings).not.toHaveProperty("instructions");
  });
});
