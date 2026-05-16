import type { UIMessage } from "ai";
import type { WorkingMemory } from "@/config/working-memory";

// AI SDK 6 verification note (checked in node_modules/ai/src + docs):
// - Tool definitions use `tool({ inputSchema, execute })`.
// - UI parts are emitted as `tool-<toolName>` with state transitions
//   (`input-streaming` | `input-available` | `output-available` | `output-error`).
// This file mirrors that contract so UI rendering remains type-safe.

type ArtifactKind = "field-brief" | "playbook" | "analytical-read" | "proposal-shell";

export type ArtifactToolUIResult = {
  artifactId: string;
  artifactType: ArtifactKind;
  title: string;
  status: "ready";
  createdAt: string;
  formats: Array<{
    format: "pdf";
    mediaType: "application/pdf";
    filename: string;
    downloadUrl: string;
  }>;
};

export type MyUIMessage = UIMessage<
  unknown,
  {
    "conversation-title": {
      title: string;
    };
    "new-thread-created": {
      threadId: string;
      title: string;
      resourceId: string;
      createdAt: string;
      updatedAt: string;
    };
  },
  {
    webSearch: {
      input: { query: string };
      output: Array<{
        title: string | null;
        url: string;
        content: string;
        publishedDate?: string;
      }>;
    };
    updateWorkingMemory: {
      input: { memory: WorkingMemory };
      output: { success: boolean };
    };
    generateFieldBrief: {
      input: unknown;
      output: ArtifactToolUIResult;
    };
    generatePlaybook: {
      input: unknown;
      output: ArtifactToolUIResult;
    };
    generateAnalyticalRead: {
      input: unknown;
      output: ArtifactToolUIResult;
    };
    generateProposalShell: {
      input: unknown;
      output: ArtifactToolUIResult;
    };
  }
>;
