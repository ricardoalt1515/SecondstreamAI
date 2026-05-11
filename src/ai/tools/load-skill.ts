import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tool } from "ai";
import { z } from "zod";

const SKILLS_BASE_DIR = "./src/ai/skills";

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export const loadSkillTool = tool({
  description:
    "Load specialized skill instructions from a markdown file. Use this when you need detailed guidance for a specific task like 'multimodal-intake', 'commercial-shaping', etc.",
  inputSchema: z.object({
    name: z
      .string()
      .describe('The exact skill name to load (e.g., "multimodal-intake", "commercial-shaping")'),
  }),
  execute: async ({ name }) => {
    try {
      const skillPath = join(process.cwd(), SKILLS_BASE_DIR, name, "SKILL.md");
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
        error: `Skill '${name}' not found. Available skills: multimodal-intake, sds-interpretation, sub-discipline-router, specialist-lens-light, safety-flagging, commercial-shaping, discovery-gap-analysis, qualification-gate, discovery-reporting, trainee-mode`,
      };
    }
  },
});
