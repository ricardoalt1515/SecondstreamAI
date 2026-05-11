import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILLS_DIR = "./src/ai/skills";

// Expected skills based on the discovery agent prompt
const EXPECTED_SKILLS = [
  "multimodal-intake",
  "sds-interpretation",
  "sub-discipline-router",
  "specialist-lens-light",
  "safety-flagging",
  "commercial-shaping",
  "discovery-gap-analysis",
  "qualification-gate",
  "discovery-reporting",
  "trainee-mode",
];

describe("Skills Integration", () => {
  it("debería tener todas las skills esperadas", async () => {
    const skillsDir = await readdir(SKILLS_DIR, { withFileTypes: true });
    const actualSkills = skillsDir
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(actualSkills).toEqual(EXPECTED_SKILLS.sort());
  });

  it("cada skill debería tener un archivo SKILL.md", async () => {
    for (const skillName of EXPECTED_SKILLS) {
      const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");

      try {
        const content = await readFile(skillPath, "utf-8");
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(100); // Should have substantial content
      } catch (_error) {
        throw new Error(`Skill ${skillName} no tiene SKILL.md o no se puede leer`);
      }
    }
  });

  it("cada SKILL.md debería tener frontmatter YAML válido", async () => {
    for (const skillName of EXPECTED_SKILLS) {
      const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
      const content = await readFile(skillPath, "utf-8");

      // Check for YAML frontmatter
      expect(content).toMatch(/^---\r?\n/);
      expect(content).toMatch(/\r?\n---\r?\n/);

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatterMatch) {
        throw new Error(`Skill ${skillName} no tiene frontmatter válido`);
      }

      const frontmatter = frontmatterMatch[1];

      // Check for required fields
      expect(frontmatter).toMatch(/name:\s*\S+/);
      expect(frontmatter).toMatch(/description:/);
    }
  });

  it("cada SKILL.md debería tener secciones requeridas", async () => {
    for (const skillName of EXPECTED_SKILLS) {
      const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
      const content = await readFile(skillPath, "utf-8");

      // Should have a title (# Title)
      expect(content).toMatch(/^#\s+\S+/m);

      // Should have at least one ## section (any heading level 2)
      expect(content).toMatch(/##\s+\S+/);
    }
  });

  it("commercial-shaping debería tener contenido comercial específico", async () => {
    const skillPath = join(SKILLS_DIR, "commercial-shaping", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("Opportunity sizing");
    expect(content).toContain("Positioning and sales craft");
    expect(content).toContain("smart questions");
  });

  it("safety-flagging debería tener contenido de seguridad específico", async () => {
    const skillPath = join(SKILLS_DIR, "safety-flagging", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("STOP-FLAG");
    expect(content).toContain("safety");
    expect(content).toContain("qualification-gate");
  });

  it("qualification-gate debería tener criterios de evaluación", async () => {
    const skillPath = join(SKILLS_DIR, "qualification-gate", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("The six criteria");
    expect(content).toContain("Identity pinned");
    expect(content).toContain("Composition documented");
  });
});
