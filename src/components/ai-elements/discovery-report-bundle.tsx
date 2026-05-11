"use client";

import { CheckIcon, FileTextIcon, LoaderIcon, TriangleAlertIcon } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

void React;

type DiscoveryReportBundleProps = {
  state: string;
  input?: {
    qualificationGate?: { status?: string };
    safetyFlags?: Array<unknown>;
  };
  output?: {
    snapshotInline?: string;
    presentFiles?: Array<{
      filename: string;
      mediaType: string;
      url: string;
    }>;
    manifest?: {
      bundleId?: string;
      files?: Array<unknown>;
    };
  };
  className?: string;
};

export function DiscoveryReportBundle({
  state,
  input,
  output,
  className,
}: DiscoveryReportBundleProps): React.JSX.Element {
  if (state === "output-error") {
    return (
      <output className={cn("text-destructive flex items-center gap-2 text-sm", className)}>
        <TriangleAlertIcon className="size-4" />
        <span>Discovery report bundle failed.</span>
      </output>
    );
  }

  if (state === "output-available") {
    const files = output?.presentFiles ?? [];
    return (
      <output className={cn("block space-y-2 rounded-md border p-3", className)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckIcon className="size-4" />
          <span>Discovery report bundle ready</span>
        </div>
        {output?.snapshotInline ? <p className="text-sm">{output.snapshotInline}</p> : null}
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={`${file.filename}-${file.url}`}>
              <a
                className="inline-flex items-center gap-1 text-sm underline"
                href={file.url}
                rel="noreferrer"
                target="_blank"
              >
                <FileTextIcon className="size-3.5" />
                {file.filename}
              </a>
            </li>
          ))}
        </ul>
      </output>
    );
  }

  const gateStatus = input?.qualificationGate?.status?.toUpperCase() ?? "PENDING";
  const safetyCount = input?.safetyFlags?.length ?? 0;

  return (
    <output className={cn("text-muted-foreground flex items-center gap-2 text-sm", className)}>
      <LoaderIcon className="size-4 animate-spin" />
      <div>
        <p>Generating discovery report bundle...</p>
        <p className="text-xs">Gate: {gateStatus}</p>
        <p className="text-xs">Safety flags: {safetyCount}</p>
      </div>
    </output>
  );
}
