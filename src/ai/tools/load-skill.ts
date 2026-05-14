import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tool } from "ai";
import { z } from "zod";

const DEFAULT_SKILLS_DIR = join(process.cwd(), "src/ai/skills");

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export const createLoadSkillTool = (baseDir: string = DEFAULT_SKILLS_DIR) =>
  tool({
    description:
      "Load specialized skill instructions from a markdown file under src/ai/skills/<name>/SKILL.md.",
    inputSchema: z.object({
      name: z.string().describe("The exact skill name to load (matches the skill directory name)."),
    }),
    execute: async ({ name }) => {
      try {
        const skillPath = join(baseDir, name, "SKILL.md");
        const content = await readFile(skillPath, "utf-8");
        const body = stripFrontmatter(content);

        return {
          skillName: name,
          content: body,
          loaded: true,
        };
      } catch (_error) {
        return {
          skillName: name,
          content: "",
          loaded: false,
          error: `Skill '${name}' not found at ${join(baseDir, name, "SKILL.md")}.`,
        };
      }
    },
  });

export const loadSkillTool = createLoadSkillTool();
