import { describe, expect, it, vi } from "vitest";

const captured: { settings?: Record<string, unknown> } = {};

vi.mock("ai", () => {
  class MockToolLoopAgent {
    tools: Record<string, unknown>;

    constructor(settings: Record<string, unknown>) {
      captured.settings = settings;
      this.tools = (settings.tools as Record<string, unknown>) ?? {};
    }
  }

  return {
    ToolLoopAgent: MockToolLoopAgent,
    stepCountIs: (count: number) => count,
  };
});

vi.mock("@ai-sdk/amazon-bedrock", () => ({
  createAmazonBedrock: vi.fn(() => vi.fn(() => ({ provider: "bedrock-model" }))),
}));

vi.mock("@/ai/tools/load-skill", () => ({
  loadSkillTool: { name: "loadSkill" },
}));

vi.mock("@/lib/agents/tools/generate-discovery-report-bundle", () => ({
  createGenerateDiscoveryReportBundleTool: vi.fn(() => ({ name: "generateDiscoveryReportBundle" })),
}));

describe("discoveryAgent", () => {
  it("registra tool generateDiscoveryReportBundle junto a loadSkill", async () => {
    const { discoveryAgent } = await import("@/lib/agents/discovery-agent");

    const tools = (discoveryAgent as { tools: Record<string, unknown> }).tools;
    expect(tools.loadSkill).toBeTruthy();
    expect(tools.generateDiscoveryReportBundle).toBeTruthy();

    const instructions = captured.settings?.instructions;
    expect(typeof instructions).toBe("string");
    expect(String(instructions)).toContain("discovery-reporting");
  });
});
