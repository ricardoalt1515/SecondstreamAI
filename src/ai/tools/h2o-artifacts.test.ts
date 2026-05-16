import type { ToolExecuteFunction } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { ArtifactStore } from "@/lib/artifacts/artifact-store";
import { InMemoryArtifactPdfStorage } from "@/lib/artifacts/pdf-storage";
import type { OwnerContext } from "@/lib/auth/owner-context";
import {
  type ArtifactToolResult,
  analyticalReadInputSchema,
  createH2oArtifactTools,
  fieldBriefInputSchema,
  playbookInputSchema,
  proposalShellInputSchema,
} from "./h2o-artifacts";

const owner: OwnerContext = { identityId: "identity-1", userId: "user-1" };

const fieldBriefInput = {
  customer: { name: "Prairie Water", slug: "prairie-water" },
  stage: "Qualify",
  confidence: "MEDIUM",
  sections: {
    whatThisIs: {
      insight: "Lagoon pressure is the deal driver.",
      body: "Evidence points to capacity strain.",
    },
    whatWeWouldPropose: {
      insight: "Lead with modular capacity and avoided surcharge exposure.",
      recommendedApproach: "Modular treatment-stage expansion.",
      winWinArguments: [
        { lead: "Avoid delay", body: "Keeps the customer ahead of permit pressure." },
      ],
      costOfAlternativeRows: [
        { component: "Delay", theirPath: "$1M+ exposure", ourProposal: "Controlled capex" },
      ],
    },
    whatCouldKillIt: {
      insight: "Budget timing can stall the deal.",
      risks: [
        {
          name: "Budget freeze",
          mechanism: "Capital window slips.",
          mitigation: "Anchor phased scope.",
        },
      ],
    },
    doThisNext: {
      insight: "Close the data gap this week.",
      actions: [
        { title: "Ask for NPDES schedule", timeframe: "7 days", body: "Confirm deadlines." },
        {
          title: "Map decision roles",
          timeframe: "14 days",
          body: "Identify utility and finance owners.",
        },
        { title: "Draft scope", timeframe: "21 days", body: "Prepare modular option." },
      ],
    },
  },
};

const playbookInput = {
  customer: { name: "Prairie Water", slug: "prairie-water" },
  themes: [{ title: "Budget", questions: ["Who owns capital approval?"] }],
};

const analyticalReadInput = {
  customer: { name: "Prairie Water", slug: "prairie-water" },
  summary: "Capacity strain plus NPDES horizon define the deal.",
  sections: [{ heading: "Evidence", body: "Flow data supports the wet-weather lens." }],
};

const proposalShellInput = {
  customer: { name: "Prairie Water", slug: "prairie-water" },
  executiveSummary: "Phased modular capacity caps capex.",
  proposedScope: ["Modular treatment-stage expansion"],
  sizingAndPricing: "Range $4.2M-$5.8M MEDIUM confidence.",
  schedule: "Mobilise Q3 2026.",
  commitments: { commitTo: ["Phase-1 scope"], doNotCommitYet: ["Phase-2 sizing"] },
};

const createStore = (): ArtifactStore => ({
  getActiveArtifact: vi.fn(),
  listArtifactsByThread: vi.fn(),
  putArtifact: vi.fn(async (input, artifactOwner) => ({
    id: "artifact-1",
    ownerIdentityId: artifactOwner.identityId,
    ownerUserId: artifactOwner.userId,
    threadId: input.threadId,
    kind: input.kind,
    status: input.status,
    title: input.title,
    customerSlug: input.customerSlug,
    payloadVersion: input.payloadVersion,
    payload: input.payload,
    createdAtIso: "2026-05-15T00:00:00.000Z",
    updatedAtIso: "2026-05-15T00:00:00.000Z",
  })),
});

const executeTool = async (tool: unknown, input: unknown): Promise<ArtifactToolResult> => {
  const execute = (tool as { execute: ToolExecuteFunction<unknown, ArtifactToolResult> }).execute;
  const result: unknown = await execute(input, { toolCallId: "tool-call-1", messages: [] });
  if (Symbol.asyncIterator in Object(result)) {
    throw new TypeError("artifact tool returned an async iterable result");
  }
  return result as ArtifactToolResult;
};

describe("H2O artifact tool schemas", () => {
  it("accepts valid minimal inputs for all four artifact kinds", () => {
    expect(fieldBriefInputSchema.safeParse(fieldBriefInput).success).toBe(true);
    expect(
      playbookInputSchema.safeParse({
        customer: { name: "Prairie Water" },
        themes: [{ title: "Budget", questions: ["Who owns capital approval?"] }],
      }).success,
    ).toBe(true);
    expect(
      analyticalReadInputSchema.safeParse({
        customer: { name: "Prairie Water" },
        summary: "Capacity pressure is material.",
        sections: [{ heading: "Evidence", body: "NPDES schedule suggests urgency." }],
      }).success,
    ).toBe(true);
    expect(
      proposalShellInputSchema.safeParse({
        customer: { name: "Prairie Water" },
        executiveSummary: "A phased scope reduces risk.",
        proposedScope: ["Phase 1 assessment"],
        sizingAndPricing: "Directional only.",
        schedule: "30-60 days.",
        commitments: { commitTo: ["Assessment"], doNotCommitYet: ["Final design"] },
      }).success,
    ).toBe(true);
  });

  it("rejects malformed artifact inputs", () => {
    expect(fieldBriefInputSchema.safeParse({ ...fieldBriefInput, stage: "Unknown" }).success).toBe(
      false,
    );
    expect(
      fieldBriefInputSchema.safeParse({
        ...fieldBriefInput,
        sections: { ...fieldBriefInput.sections, doThisNext: { insight: "x", actions: [] } },
      }).success,
    ).toBe(false);
    expect(
      playbookInputSchema.safeParse({ customer: { name: "Prairie" }, themes: [] }).success,
    ).toBe(false);
  });
});

describe("createH2oArtifactTools returns 4 atomic tools", () => {
  it("exposes exactly the four expected tool keys", () => {
    const tools = createH2oArtifactTools({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      owner,
      threadId: "thread-1",
    });

    expect(Object.keys(tools).sort()).toEqual(
      [
        "generateFieldBrief",
        "generatePlaybook",
        "generateAnalyticalRead",
        "generateProposalShell",
      ].sort(),
    );
  });
});

describe("generateFieldBrief", () => {
  it("persists the field brief PDF and returns the correct output shape", async () => {
    const artifactStore = createStore();
    const pdfStorage = new InMemoryArtifactPdfStorage();
    const tools = createH2oArtifactTools({
      artifactStore,
      pdfStorage,
      owner,
      threadId: "thread-1",
    });

    const result = await executeTool(tools.generateFieldBrief, fieldBriefInput);

    expect(artifactStore.putArtifact).toHaveBeenCalledTimes(1);
    expect(result.artifactType).toBe("field-brief");
    expect(result.status).toBe("ready");
    expect(result.formats).toHaveLength(1);
    expect(result.formats[0].format).toBe("pdf");

    const stored = await pdfStorage.get({
      kind: "field-brief",
      threadId: "thread-1",
      userId: owner.userId,
    });
    expect(stored).not.toBeNull();
    expect(stored?.subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);
});

describe("generatePlaybook", () => {
  it("persists the playbook PDF and returns the correct output shape", async () => {
    const artifactStore = createStore();
    const pdfStorage = new InMemoryArtifactPdfStorage();
    const tools = createH2oArtifactTools({
      artifactStore,
      pdfStorage,
      owner,
      threadId: "thread-1",
    });

    const result = await executeTool(tools.generatePlaybook, playbookInput);

    expect(artifactStore.putArtifact).toHaveBeenCalledTimes(1);
    expect(result.artifactType).toBe("playbook");
    expect(result.status).toBe("ready");
    expect(result.formats[0].format).toBe("pdf");
  }, 30_000);
});

describe("generateAnalyticalRead", () => {
  it("persists the analytical read PDF and returns the correct output shape", async () => {
    const artifactStore = createStore();
    const pdfStorage = new InMemoryArtifactPdfStorage();
    const tools = createH2oArtifactTools({
      artifactStore,
      pdfStorage,
      owner,
      threadId: "thread-1",
    });

    const result = await executeTool(tools.generateAnalyticalRead, analyticalReadInput);

    expect(artifactStore.putArtifact).toHaveBeenCalledTimes(1);
    expect(result.artifactType).toBe("analytical-read");
    expect(result.status).toBe("ready");
    expect(result.formats[0].format).toBe("pdf");
  }, 30_000);
});

describe("generateProposalShell", () => {
  it("persists the proposal shell PDF and returns the correct output shape", async () => {
    const artifactStore = createStore();
    const pdfStorage = new InMemoryArtifactPdfStorage();
    const tools = createH2oArtifactTools({
      artifactStore,
      pdfStorage,
      owner,
      threadId: "thread-1",
    });

    const result = await executeTool(tools.generateProposalShell, proposalShellInput);

    expect(artifactStore.putArtifact).toHaveBeenCalledTimes(1);
    expect(result.artifactType).toBe("proposal-shell");
    expect(result.status).toBe("ready");
    expect(result.formats[0].format).toBe("pdf");
  }, 30_000);
});

describe("propagates render failure", () => {
  it("rejects when renderArtifactPdf throws", async () => {
    const renderModule = await import("@/lib/artifacts/pdf-renderer-dispatch");
    const renderSpy = vi
      .spyOn(renderModule, "renderArtifactPdf")
      .mockRejectedValueOnce(new Error("render failure"));

    const tools = createH2oArtifactTools({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      owner,
      threadId: "thread-1",
    });

    await expect(executeTool(tools.generateFieldBrief, fieldBriefInput)).rejects.toThrow(
      "render failure",
    );

    renderSpy.mockRestore();
  });
});
