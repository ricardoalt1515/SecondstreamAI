import type { UIMessage } from "ai";
import type { WorkingMemory } from "@/config/working-memory";
import type { ReportBundleManifest, ReportBundleRequest } from "@/lib/reporting/schemas";

// AI SDK 6 verification note (checked in node_modules/ai/src + docs):
// - Tool definitions use `tool({ inputSchema, execute })`.
// - UI parts are emitted as `tool-<toolName>` with state transitions
//   (`input-streaming` | `input-available` | `output-available` | `output-error`).
// This file mirrors that contract so UI rendering remains type-safe.

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
    generateDiscoveryReportBundle: {
      input: ReportBundleRequest;
      output: {
        snapshotInline: string;
        manifest: ReportBundleManifest;
        presentFiles: Array<{
          filename: string;
          mediaType: string;
          url: string;
        }>;
      };
    };
  }
>;
