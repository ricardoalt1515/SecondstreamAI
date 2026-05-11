import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { stepCountIs, ToolLoopAgent } from "ai";
import { ASSISTANT_SYSTEM_PROMPT } from "@/ai/prompts/assistant";
import { loadSkillTool } from "@/ai/tools/load-skill";
import { getEnv } from "@/config/env";
import { createGenerateDiscoveryReportBundleTool } from "@/lib/agents/tools/generate-discovery-report-bundle";
import { renderPdfFromHtml } from "@/lib/reporting/playwright-renderer";
import { renderExecutiveReportHtml } from "@/lib/reporting/templates/executive-report-template";
import type { BlobStore } from "@/lib/storage/blob-store";
import { createS3BlobStore } from "@/lib/storage/s3-blob-store";

const MODEL_ID = "us.anthropic.claude-sonnet-4-6-v1";

let cachedReportBlobStore: BlobStore | null = null;

const getReportBlobStore = (): BlobStore => {
  if (cachedReportBlobStore) {
    return cachedReportBlobStore;
  }

  const env = getEnv();
  cachedReportBlobStore = createS3BlobStore({
    bucket: env.CHAT_ATTACHMENTS_S3_BUCKET,
    prefix: env.CHAT_ATTACHMENTS_S3_PREFIX,
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  });
  return cachedReportBlobStore;
};

const reportBlobStore: BlobStore = {
  put: (input) => getReportBlobStore().put(input),
  get: (key) => getReportBlobStore().get(key),
  delete: (key) => getReportBlobStore().delete(key),
};

const generateDiscoveryReportBundleTool = createGenerateDiscoveryReportBundleTool({
  bundleDeps: {
    blobStore: reportBlobStore,
  },
  renderExecutivePdf: async (request) => {
    const html = renderExecutiveReportHtml(request);
    return renderPdfFromHtml(html);
  },
});

export const discoveryAgent = new ToolLoopAgent({
  model: (() => {
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION || "us-east-1",
    });
    return bedrock(MODEL_ID);
  })(),
  instructions: `${ASSISTANT_SYSTEM_PROMPT}

## Available Skills

You have access to specialized skills stored in markdown files. When a user's request would benefit from detailed instructions for a specific task, call the \`loadSkill\` tool with the skill name.

Available skills (call loadSkill with the exact name):
- multimodal-intake: Extract structured data from photos, voice notes, video
- sds-interpretation: Extract and interpret SDS, COA, and analytical reports
- sub-discipline-router: Decompose opportunities into sub-streams with specialist lenses
- specialist-lens-light: Produce profile questions and red flags per sub-stream
- safety-flagging: Classify safety flags and surface stop-flags
- commercial-shaping: Size opportunities and produce commercial briefs
- discovery-gap-analysis: Identify Required vs Nice-to-have gaps
- qualification-gate: Run six-criteria qualification check
- discovery-reporting: Produce three-tier discovery reports
- trainee-mode: Adjust tone for less experienced users

Call loadSkill when you need detailed instructions for any of these tasks.`,
  tools: {
    loadSkill: loadSkillTool,
    generateDiscoveryReportBundle: generateDiscoveryReportBundleTool,
  },
  stopWhen: stepCountIs(20),
});
