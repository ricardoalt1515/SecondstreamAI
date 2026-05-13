type StreamifiedHandler = (
  event: unknown,
  responseStream: NodeJS.WritableStream & {
    setContentType?: (contentType: string) => void;
  },
) => Promise<void>;

declare const awslambda: {
  streamifyResponse: (handler: StreamifiedHandler) => unknown;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const handler = awslambda.streamifyResponse(async (_event, responseStream) => {
  responseStream.setContentType?.("text/plain; charset=utf-8");

  for (let index = 1; index <= 5; index += 1) {
    responseStream.write(`chunk ${index} ${new Date().toISOString()}\n`);
    await sleep(1000);
  }

  responseStream.end();
});
