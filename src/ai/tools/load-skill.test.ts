import type { ToolExecuteFunction } from "ai";
import { describe, expect, it, vi } from "vitest";

type LoadSkillResult = {
  skillName: string;
  content: string;
  loaded: boolean;
  error?: string;
};

// Mock the ai module to avoid opentelemetry issues in tests
vi.mock("ai", () => ({
  tool: vi.fn((config: unknown) => config),
}));

const { loadSkillTool } = await import("./load-skill");

const executeLoadSkill = loadSkillTool.execute as ToolExecuteFunction<
  { name: string },
  LoadSkillResult
>;

function isAsyncIterable<T>(value: T | AsyncIterable<T>): value is AsyncIterable<T> {
  return Symbol.asyncIterator in Object(value);
}

async function loadSkill(name: string, toolCallId: string): Promise<LoadSkillResult> {
  const result = await executeLoadSkill(
    { name },
    {
      toolCallId,
      messages: [],
    },
  );

  if (isAsyncIterable(result)) {
    throw new TypeError("loadSkillTool returned an async iterable result");
  }

  return result;
}

describe("loadSkillTool", () => {
  it("debería cargar skill existente correctamente", async () => {
    const result = await loadSkill("commercial-shaping", "test-1");

    expect(result.loaded).toBe(true);
    expect(result.skillName).toBe("commercial-shaping");
    expect(result.content).toContain("Commercial shaping");
    expect(result.content).toContain("Opportunity sizing");
    expect(result.error).toBeUndefined();
  });

  it("debería manejar skill no existente", async () => {
    const result = await loadSkill("non-existent-skill", "test-2");

    expect(result.loaded).toBe(false);
    expect(result.skillName).toBe("non-existent-skill");
    expect(result.content).toBe("");
    expect(result.error).toContain("not found");
    expect(result.error).toContain("multimodal-intake"); // Debe listar skills disponibles
  });

  it("debería cargar skill de multimodal-intake", async () => {
    const result = await loadSkill("multimodal-intake", "test-3");

    expect(result.loaded).toBe(true);
    expect(result.content).toContain("Multimodal intake");
    expect(result.content).toContain("Photos");
  });

  it("debería cargar skill de safety-flagging", async () => {
    const result = await loadSkill("safety-flagging", "test-4");

    expect(result.loaded).toBe(true);
    expect(result.content).toContain("STOP-FLAG");
    expect(result.content).toContain("safety");
  });

  it("debería cargar skill de qualification-gate", async () => {
    const result = await loadSkill("qualification-gate", "test-5");

    expect(result.loaded).toBe(true);
    expect(result.content).toContain("Qualification gate");
    expect(result.content).toContain("The six criteria");
  });

  it("debería cargar skill de trainee-mode", async () => {
    const result = await loadSkill("trainee-mode", "test-6");

    expect(result.loaded).toBe(true);
    expect(result.content).toContain("Trainee mode");
    expect(result.content).toContain("explanation");
  });
});
