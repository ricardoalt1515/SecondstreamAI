import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { stepCountIs, ToolLoopAgent } from "ai";
import { WATER_SECTOR_SYSTEM_PROMPT } from "@/ai/prompts/water-sector";
import { loadSkillTool } from "@/ai/tools/load-skill";

const MODEL_ID = "us.anthropic.claude-sonnet-4-6";

export const courtReporterAgent = new ToolLoopAgent({
  model: (() => {
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION || "us-east-1",
    });
    return bedrock(MODEL_ID);
  })(),
  instructions: `${WATER_SECTOR_SYSTEM_PROMPT}

## Available Skills

You have access to specialized skills stored in markdown files. Call the \`loadSkill\` tool only when the user's water-sector request needs one of these exact skill workflows:

- multimodal-intake: Extract structured data from photos, voice notes, video, or uploaded context
- discovery-reporting: Produce downloadable report-style artifacts when explicitly requested
- trainee-mode: Add teaching annotations for less experienced users

Keep every skill result inside the Water Sector safety boundary: draft support only, qualified human review required, no regulatory, engineering, legal, or operational certification authority.`,
  tools: {
    loadSkill: loadSkillTool,
  },
  stopWhen: stepCountIs(20),
});
