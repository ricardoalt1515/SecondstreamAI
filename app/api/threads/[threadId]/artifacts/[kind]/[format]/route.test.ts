import { describe, expect, it, vi } from "vitest";
import type { ArtifactRecord, ArtifactStore } from "@/lib/artifacts/artifact-store";
import type {
  AnalyticalReadPayload,
  FieldBriefPayload,
  PlaybookPayload,
  ProposalShellPayload,
} from "@/lib/artifacts/payloads";
import { InMemoryArtifactPdfStorage } from "@/lib/artifacts/pdf-storage";
import { AuthRequiredError } from "@/lib/auth/errors";
import type { OwnerContext } from "@/lib/auth/owner-context";
import { createArtifactDownloadHandler } from "./route";

const owner: OwnerContext = { identityId: "identity-a", userId: "user-a" };

const fieldBriefPayload: FieldBriefPayload = {
  customer: { location: "Prairie, TX", name: "Prairie Water", slug: "prairie-water" },
  stage: "Qualify",
  confidence: "MEDIUM",
  date: "2026-05-15",
  stopFlags: [{ title: "Budget timing", summary: "Capital approval may slip." }],
  sections: {
    whatThisIs: {
      insight: "Lagoon pressure is the deal driver.",
      body: "Evidence points to capacity strain and NPDES schedule pressure.",
    },
    whatWeWouldPropose: {
      insight: "Lead with modular capacity and avoided surcharge exposure.",
      recommendedApproach: "Modular treatment-stage expansion with a narrow first-phase scope.",
      winWinArguments: [
        { lead: "Avoid delay", body: "Keeps the customer ahead of permit pressure." },
        { lead: "Control spend", body: "Makes the capital request easier to stage." },
      ],
      costOfAlternativeRows: [
        { component: "Delay", theirPath: "$1M+ exposure", ourProposal: "Controlled capex" },
        { component: "Total", theirPath: "Unbounded", ourProposal: "Phased", isTotal: true },
      ],
      dealSizeSensitivity: "Validate budget range before promising final design.",
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

const artifact: ArtifactRecord = {
  createdAtIso: "2026-05-15T00:00:00.000Z",
  customerSlug: "prairie-water",
  id: "artifact-1",
  kind: "field-brief" as const,
  ownerIdentityId: owner.identityId,
  ownerUserId: owner.userId,
  payload: fieldBriefPayload,
  payloadVersion: 1,
  status: "ready",
  threadId: "thread-1",
  title: "Prairie Water Field Brief",
  updatedAtIso: "2026-05-15T00:00:00.000Z",
};

const playbookArtifact: ArtifactRecord = {
  ...artifact,
  kind: "playbook",
  payload: {
    customer: { name: "Prairie Water", slug: "prairie-water" },
    themes: [{ questions: ["Who owns capital approval?"], title: "Budget" }],
  } satisfies PlaybookPayload,
  title: "Conversation Playbook",
};

const analyticalReadArtifact: ArtifactRecord = {
  ...artifact,
  kind: "analytical-read",
  payload: {
    customer: { name: "Prairie Water", slug: "prairie-water" },
    summary: "Capacity strain plus NPDES horizon define the deal.",
    sections: [{ heading: "Evidence", body: "Flow data supports the wet-weather lens." }],
  } satisfies AnalyticalReadPayload,
  title: "Analytical Read",
};

const proposalShellArtifact: ArtifactRecord = {
  ...artifact,
  kind: "proposal-shell",
  payload: {
    customer: { name: "Prairie Water", slug: "prairie-water" },
    executiveSummary: "Phased modular capacity caps capex.",
    proposedScope: ["Modular treatment-stage expansion"],
    sizingAndPricing: "Range $4.2M-$5.8M MEDIUM confidence.",
    schedule: "Mobilise Q3 2026.",
    commitments: { commitTo: ["Phase-1 scope"], doNotCommitYet: ["Phase-2 sizing"] },
  } satisfies ProposalShellPayload,
  title: "Proposal Shell",
};

const createStore = (record: ArtifactRecord | null = artifact): ArtifactStore => ({
  getActiveArtifact: vi.fn(async () => record),
  listArtifactsByThread: vi.fn(async () => (record ? [record] : [])),
  putArtifact: vi.fn(async () => artifact),
});

const request = new Request("https://example.test/api/threads/thread-1/artifacts/field-brief/md");

const ownedThread = {
  createdAt: "",
  id: "thread-1",
  resourceId: owner.userId,
  title: null,
  updatedAt: "",
};

describe("artifact download route", () => {
  it("returns 401 when the requester is unauthenticated", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => {
        throw new AuthRequiredError();
      },
      getThread: async () => null,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("x-error-code")).toBe("AUTH_REQUIRED");
  });

  it("returns 400 for invalid artifact kind or format", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "zip", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_ROUTE_INVALID");
  });

  it("returns 404 when the thread is missing or owned by someone else", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ({ ...ownedThread, resourceId: "other-user" }),
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_NOT_FOUND");
  });

  it("returns 404 when no active artifact exists for the thread and kind", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(null),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_NOT_FOUND");
  });

  it("returns 404 when the artifact is not ready", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore({ ...artifact, status: "failed" }),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_NOT_FOUND");
  });

  it("returns 400 when the requested format is markdown", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "md", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_ROUTE_INVALID");
  });

  it("renders Field Brief PDF from the active artifact payload with attachment headers", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="prairie-water_field-brief.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Playbook PDF from the active artifact payload with attachment headers", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(playbookArtifact),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "playbook", threadId: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="prairie-water_playbook.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Analytical Read PDF from the active artifact payload with attachment headers", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(analyticalReadArtifact),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "analytical-read", threadId: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="prairie-water_analytical-read.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("renders Proposal Shell PDF from the active artifact payload with attachment headers", async () => {
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(proposalShellArtifact),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "proposal-shell", threadId: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="prairie-water_proposal-shell.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("serves PDF bytes from pdfStorage when they exist (fast path, no re-render)", async () => {
    const pdfStorage = new InMemoryArtifactPdfStorage();
    const fakeBytes = Buffer.concat([Buffer.from("%PDF-1.4 fast-path bytes")]);
    await pdfStorage.put({
      bytes: fakeBytes,
      kind: "field-brief",
      threadId: "thread-1",
      userId: owner.userId,
    });

    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(),
      pdfStorage,
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Exact match: we returned the stored bytes, not a freshly rendered PDF.
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.4 fast-path bytes");
  });

  it("returns 422 with x-error-code ARTIFACT_PAYLOAD_INVALID when the persisted payload fails schema validation", async () => {
    // Reproduces the production bug: a Field Brief payload missing
    // `whatWeWouldPropose` crashes @react-pdf/renderer with an opaque 500.
    // The route now catches it at the boundary and surfaces a useful message.
    const corruptArtifact: ArtifactRecord = {
      ...artifact,
      payload: {
        customer: fieldBriefPayload.customer,
        stage: fieldBriefPayload.stage,
        sections: {
          whatThisIs: fieldBriefPayload.sections.whatThisIs,
          whatCouldKillIt: fieldBriefPayload.sections.whatCouldKillIt,
          doThisNext: fieldBriefPayload.sections.doThisNext,
        },
      } as unknown as FieldBriefPayload,
    };
    const GET = createArtifactDownloadHandler({
      artifactStore: createStore(corruptArtifact),
      pdfStorage: new InMemoryArtifactPdfStorage(),
      getOwner: async () => owner,
      getThread: async () => ownedThread,
    });

    const response = await GET(request, {
      params: Promise.resolve({ format: "pdf", kind: "field-brief", threadId: "thread-1" }),
    });

    expect(response.status).toBe(422);
    expect(response.headers.get("x-error-code")).toBe("ARTIFACT_PAYLOAD_INVALID");
    expect(await response.text()).toMatch(/whatWeWouldPropose/);
  });
});
