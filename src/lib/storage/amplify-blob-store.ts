import { getUrl, remove, uploadData } from "aws-amplify/storage/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { assertAmplifyOutputsConfigured } from "@/config/amplify-runtime";
import { getCurrentOwner, runWithAmplifyServerContext } from "@/lib/auth/server";
import type { BlobStore, PutBlobInput, PutBlobResult } from "@/lib/storage/blob-store";

const safeSegment = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, "-");

export const buildAmplifyPrivatePath = (identityId: string, input: PutBlobInput): string =>
  `private/${identityId}/sessions/${safeSegment(input.threadId)}/${nanoid()}-${safeSegment(input.filename)}`;

export class AmplifyBlobStore implements BlobStore {
  async put(input: PutBlobInput): Promise<PutBlobResult> {
    assertAmplifyOutputsConfigured();
    const owner = await getCurrentOwner();
    const path = buildAmplifyPrivatePath(owner.identityId, input);

    const url = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        await uploadData(contextSpec, {
          path,
          data: input.bytes,
          options: { contentType: input.mediaType },
        }).result;
        const result = await getUrl(contextSpec, { path });
        return result.url.toString();
      },
    });

    return { key: path, url, sizeBytes: input.bytes.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    assertAmplifyOutputsConfigured();
    const url = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const result = await getUrl(contextSpec, {
          path: key,
          options: { validateObjectExistence: true },
        });
        return result.url.toString();
      },
    });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to download Amplify Storage object: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    assertAmplifyOutputsConfigured();
    await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => remove(contextSpec, { path: key }),
    });
  }
}

export const createAmplifyBlobStore = (): BlobStore => new AmplifyBlobStore();
