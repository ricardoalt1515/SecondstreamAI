import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolExecuteFunction } from "ai";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type LoadSkillResult = {
  skillName: string;
  skillDirectory?: string;
  content: string;
  loaded: boolean;
  error?: string;
};

vi.mock("ai", () => ({
  tool: vi.fn((config: unknown) => config),
}));

const { createLoadSkillTool } = await import("./load-skill");

function isAsyncIterable<T>(value: T | AsyncIterable<T>): value is AsyncIterable<T> {
  return Symbol.asyncIterator in Object(value);
}

const FIXTURE_SKILL = "loader-fixture";
const FIXTURE_CONTENT = `---
name: ${FIXTURE_SKILL}
description: Temporary fixture used by load-skill.test.ts
---

# Loader Fixture

## Body

Sample body content used to assert frontmatter stripping and content loading.
`;

describe("loadSkillTool", () => {
  let baseDir: string;
  let loadSkill: (name: string, toolCallId: string) => Promise<LoadSkillResult>;

  beforeAll(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "load-skill-test-"));
    await mkdir(join(baseDir, FIXTURE_SKILL), { recursive: true });
    await writeFile(join(baseDir, FIXTURE_SKILL, "SKILL.md"), FIXTURE_CONTENT, "utf-8");

    const tool = createLoadSkillTool(baseDir);
    const execute = tool.execute as ToolExecuteFunction<{ name: string }, LoadSkillResult>;

    loadSkill = async (name, toolCallId) => {
      const result = await execute({ name }, { toolCallId, messages: [] });
      if (isAsyncIterable(result)) {
        throw new TypeError("loadSkillTool returned an async iterable result");
      }
      return result;
    };
  });

  afterAll(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("loads an existing skill and strips frontmatter", async () => {
    const result = await loadSkill(FIXTURE_SKILL, "test-1");

    expect(result.loaded).toBe(true);
    expect(result.skillName).toBe(FIXTURE_SKILL);
    expect(result.content.startsWith("# Loader Fixture")).toBe(true);
    expect(result.content).not.toContain("---");
    expect(result.error).toBeUndefined();
  });

  it("returns loaded=false when the skill does not exist", async () => {
    const result = await loadSkill("non-existent-skill", "test-2");

    expect(result.loaded).toBe(false);
    expect(result.skillName).toBe("non-existent-skill");
    expect(result.content).toBe("");
    expect(result.error).toContain("not found");
  });

  it("rejects path traversal even when the target file exists outside the skills directory", async () => {
    await mkdir(join(baseDir, "..", "secret-skill"), { recursive: true });
    await writeFile(join(baseDir, "..", "secret-skill", "SKILL.md"), "# Secret", "utf-8");

    const result = await loadSkill("../secret-skill", "test-3");

    expect(result.loaded).toBe(false);
    expect(result.content).toBe("");
    expect(result.error).toContain("Invalid skill name");
  });

  it("rejects skill names with path separators", async () => {
    const result = await loadSkill("h2o-field-brief/../../secret", "test-4");

    expect(result.loaded).toBe(false);
    expect(result.content).toBe("");
    expect(result.error).toContain("Invalid skill name");
  });

  it("loads a real H2O skill from the default filesystem skill directory", async () => {
    const tool = createLoadSkillTool();
    const execute = tool.execute as ToolExecuteFunction<{ name: string }, LoadSkillResult>;
    const result = await execute(
      { name: "h2o-field-brief" },
      { toolCallId: "real-1", messages: [] },
    );

    if (isAsyncIterable(result)) {
      throw new TypeError("loadSkillTool returned an async iterable result");
    }

    expect(result.loaded).toBe(true);
    expect(result.skillName).toBe("h2o-field-brief");
    expect(result.skillDirectory).toContain(join("src", "ai", "skills", "h2o-field-brief"));
    expect(result.content).toContain("Field Brief");
    expect(result.content).not.toMatch(/^---/);
  });
});
