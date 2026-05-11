/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { DiscoveryReportBundle } from "@/components/ai-elements/discovery-report-bundle";

describe("DiscoveryReportBundle", () => {
  it("muestra estado de progreso durante generación", () => {
    render(
      React.createElement(DiscoveryReportBundle, {
        state: "input-available",
        input: {
          qualificationGate: { status: "open" },
          safetyFlags: [{ severity: "attention", title: "flag", details: "detail" }],
        },
      }),
    );

    expect(screen.getByText("Generating discovery report bundle...")).toBeTruthy();
    expect(screen.getByText("Gate: OPEN")).toBeTruthy();
    expect(screen.getByText("Safety flags: 1")).toBeTruthy();
  });

  it("muestra resultado con links descargables", () => {
    render(
      React.createElement(DiscoveryReportBundle, {
        state: "output-available",
        output: {
          snapshotInline: "Snapshot inline",
          presentFiles: [
            {
              filename: "acme_discovery-exec.pdf",
              mediaType: "application/pdf",
              url: "https://example.com/acme_discovery-exec.pdf",
            },
            {
              filename: "acme_discovery-full.md",
              mediaType: "text/markdown",
              url: "https://example.com/acme_discovery-full.md",
            },
          ],
          manifest: {
            bundleId: "bundle-001",
            files: [
              {
                artifactType: "executive-pdf",
                filename: "acme_discovery-exec.pdf",
                mediaType: "application/pdf",
                url: "https://example.com/acme_discovery-exec.pdf",
              },
              {
                artifactType: "full-markdown",
                filename: "acme_discovery-full.md",
                mediaType: "text/markdown",
                url: "https://example.com/acme_discovery-full.md",
              },
            ],
          },
        },
      }),
    );

    expect(screen.getByText("Snapshot inline")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links[0]?.textContent).toContain("acme_discovery-exec.pdf");
    expect(links[1]?.textContent).toContain("acme_discovery-full.md");
  });

  it("muestra error si la tool falla", () => {
    render(React.createElement(DiscoveryReportBundle, { state: "output-error" }));

    expect(screen.getByText("Discovery report bundle failed.")).toBeTruthy();
  });
});
