import { describe, expect, it } from "vitest";
import { COURT_REPORTER_AGENT_ID, courtReporterAgentConfig } from "./court-reporter-agent";
import { createAgentRegistry, createDefaultAgentRegistry, type StreamAgent } from "./registry";

const fakeAgent = {
  stream: async () => ({
    toUIMessageStream: () => new ReadableStream(),
  }),
} as StreamAgent;

describe("agent registry", () => {
  it("returns the court reporter agent by default", () => {
    const registry = createAgentRegistry([
      {
        id: COURT_REPORTER_AGENT_ID,
        config: courtReporterAgentConfig,
        agent: fakeAgent,
      },
    ]);

    expect(registry.get()).toBe(fakeAgent);
    expect(registry.get(COURT_REPORTER_AGENT_ID)).toBe(fakeAgent);
  });

  it("rejects unknown agents explicitly", () => {
    const registry = createAgentRegistry([
      {
        id: COURT_REPORTER_AGENT_ID,
        config: courtReporterAgentConfig,
        agent: fakeAgent,
      },
    ]);

    expect(() => registry.get("unknown-agent")).toThrow("Unknown agent: unknown-agent");
  });

  it("wires the default court reporter runtime instead of the discovery agent", async () => {
    const [{ courtReporterAgent }, { discoveryAgent }, registry] = await Promise.all([
      import("./court-reporter-runtime"),
      import("./discovery-agent"),
      createDefaultAgentRegistry(),
    ]);

    expect(registry.get(COURT_REPORTER_AGENT_ID)).toBe(courtReporterAgent);
    expect(registry.get(COURT_REPORTER_AGENT_ID)).not.toBe(discoveryAgent);
  });
});
